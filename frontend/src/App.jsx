import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, isAddress } from "ethers";
import { CONTRACT_ADDRESS, SOCIAL_POSTS_ABI } from "./contract.js";

function shortAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(timestamp) * 1000));
}

function normalizePost(post) {
  return {
    id: Number(post.id),
    content: post.content,
    author: post.author,
    createdAt: post.createdAt,
    likes: Number(post.likes),
    deleted: post.deleted,
  };
}

export default function App() {
  const [account, setAccount] = useState("");
  const [contractOwner, setContractOwner] = useState("");
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [likedPostIds, setLikedPostIds] = useState(new Set());
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isConfigured = Boolean(CONTRACT_ADDRESS);
  const isOwner =
    account && contractOwner && account.toLowerCase() === contractOwner.toLowerCase();

  const getProvider = useCallback(() => {
    if (!window.ethereum) throw new Error("MetaMask не знайдено");
    return new BrowserProvider(window.ethereum);
  }, []);

  const getReadContract = useCallback(() => {
    if (!isConfigured) throw new Error("Не задано VITE_CONTRACT_ADDRESS");
    const provider = getProvider();
    return new Contract(CONTRACT_ADDRESS, SOCIAL_POSTS_ABI, provider);
  }, [getProvider, isConfigured]);

  const getWriteContract = useCallback(async () => {
    const provider = getProvider();
    const signer = await provider.getSigner();
    return new Contract(CONTRACT_ADDRESS, SOCIAL_POSTS_ABI, signer);
  }, [getProvider]);

  const refreshLikedState = useCallback(
    async (loadedPosts, currentAccount = account) => {
      if (!currentAccount || !isConfigured || loadedPosts.length === 0) {
        setLikedPostIds(new Set());
        return;
      }

      try {
        const contract = getReadContract();
        const states = await Promise.all(
          loadedPosts.map((post) => contract.hasLiked(post.id, currentAccount)),
        );
        setLikedPostIds(
          new Set(loadedPosts.filter((_, index) => states[index]).map((post) => post.id)),
        );
      } catch {
        setLikedPostIds(new Set());
      }
    },
    [account, getReadContract, isConfigured],
  );

  const loadPosts = useCallback(
    async (filter = activeFilter, currentAccount = account) => {
      if (!window.ethereum || !isConfigured) return;
      setError("");
      try {
        const contract = getReadContract();
        const result = filter
          ? await contract.getPostsByAuthor(filter)
          : await contract.getAllPosts();
        const normalized = result.map(normalizePost);
        setPosts(normalized);
        await refreshLikedState(normalized, currentAccount);
      } catch (err) {
        setError(err.shortMessage || err.message || "Не вдалося завантажити пости");
      }
    },
    [account, activeFilter, getReadContract, isConfigured, refreshLikedState],
  );

  const loadOwner = useCallback(async () => {
    if (!window.ethereum || !isConfigured) return;
    try {
      const contract = getReadContract();
      setContractOwner(await contract.owner());
    } catch {
      setContractOwner("");
    }
  }, [getReadContract, isConfigured]);

  useEffect(() => {
    loadOwner();
    loadPosts("", account);
  }, [loadOwner]);

  useEffect(() => {
    if (!window.ethereum) return undefined;
    const handleAccountsChanged = async (accounts) => {
      const nextAccount = accounts[0] || "";
      setAccount(nextAccount);
      await loadPosts(activeFilter, nextAccount);
    };
    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    return () => window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
  }, [activeFilter, loadPosts]);

  const connectWallet = async () => {
    setError("");
    try {
      if (!window.ethereum) throw new Error("Встановіть MetaMask");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const nextAccount = accounts[0] || "";
      setAccount(nextAccount);
      await loadPosts(activeFilter, nextAccount);
    } catch (err) {
      setError(err.message || "Не вдалося підключити гаманець");
    }
  };

  const runTransaction = async (key, action, successText) => {
    setBusyAction(key);
    setError("");
    setMessage("");
    try {
      if (!account) await connectWallet();
      const contract = await getWriteContract();
      const tx = await action(contract);
      setMessage("Транзакцію надіслано. Очікуємо підтвердження…");
      await tx.wait();
      setMessage(successText);
      await loadPosts(activeFilter, account);
    } catch (err) {
      setError(err.shortMessage || err.reason || err.message || "Помилка транзакції");
    } finally {
      setBusyAction("");
    }
  };

  const createPost = async (event) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    await runTransaction(
      "create",
      (contract) => contract.createPost(trimmed),
      "Пост створено",
    );
    setContent("");
  };

  const applyAuthorFilter = async (event) => {
    event.preventDefault();
    const value = authorFilter.trim();
    if (!isAddress(value)) {
      setError("Введіть коректну Ethereum адресу автора");
      return;
    }
    setActiveFilter(value);
    await loadPosts(value, account);
  };

  const showAll = async () => {
    setActiveFilter("");
    setAuthorFilter("");
    await loadPosts("", account);
  };

  const showMine = async () => {
    if (!account) {
      await connectWallet();
      return;
    }
    setAuthorFilter(account);
    setActiveFilter(account);
    await loadPosts(account, account);
  };

  const stats = useMemo(
    () => ({
      count: posts.length,
      likes: posts.reduce((sum, post) => sum + post.likes, 0),
    }),
    [posts],
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Web3 Social Feed</span>
          <h1>Пости у блокчейні</h1>
          <p>
            Фільтрація за автором, видалення власних постів та лайки працюють
            через функції Solidity контракту.
          </p>
        </div>
        <div className="wallet-card">
          <span>Гаманець</span>
          <strong>{account ? shortAddress(account) : "Не підключено"}</strong>
          <button className="button secondary" onClick={connectWallet}>
            {account ? "Змінити акаунт" : "Підключити MetaMask"}
          </button>
        </div>
      </header>

      {!isConfigured && (
        <div className="notice warning">
          Вкажіть адресу контракту у frontend/.env: VITE_CONTRACT_ADDRESS=0x...
        </div>
      )}
      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      <section className="control-grid">
        <article className="panel composer">
          <span className="eyebrow">Create</span>
          <h2>Новий пост</h2>
          <form onSubmit={createPost}>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Напишіть текст поста..."
              rows="5"
              required
            />
            <button className="button primary" disabled={busyAction === "create"}>
              {busyAction === "create" ? "Публікація…" : "Опублікувати"}
            </button>
          </form>
        </article>

        <article className="panel filters">
          <span className="eyebrow">Filter</span>
          <h2>Пости конкретного автора</h2>
          <form className="filter-form" onSubmit={applyAuthorFilter}>
            <input
              value={authorFilter}
              onChange={(event) => setAuthorFilter(event.target.value)}
              placeholder="0x... адреса автора"
            />
            <button className="button primary">Показати автора</button>
          </form>
          <div className="row-actions">
            <button className="button secondary" onClick={showMine}>Мої пости</button>
            <button className="button secondary" onClick={showAll}>Усі пости</button>
          </div>
        </article>

        <article className="panel danger-zone">
          <span className="eyebrow danger-label">Delete</span>
          <h2>Керування видаленням</h2>
          <button
            className="button danger"
            disabled={!account || busyAction === "deleteMine"}
            onClick={() =>
              runTransaction(
                "deleteMine",
                (contract) => contract.deleteMyPosts(),
                "Усі ваші пости видалено",
              )
            }
          >
            Видалити всі мої пости
          </button>
          {isOwner && (
            <button
              className="button danger ghost-danger"
              disabled={busyAction === "deleteAll"}
              onClick={() =>
                runTransaction(
                  "deleteAll",
                  (contract) => contract.deleteAllPosts(),
                  "Усі пости у контракті видалено",
                )
              }
            >
              Видалити абсолютно всі пости
            </button>
          )}
          <small>
            Глобальне видалення доступне тільки власнику контракту. Звичайний
            користувач може видаляти лише власні пости.
          </small>
        </article>
      </section>

      <section className="feed-section">
        <div className="feed-heading">
          <div>
            <span className="eyebrow">Feed</span>
            <h2>{activeFilter ? "Пости вибраного автора" : "Усі активні пости"}</h2>
          </div>
          <div className="stats">
            <span>{stats.count} постів</span>
            <span>{stats.likes} лайків</span>
            <button className="button secondary compact" onClick={() => loadPosts()}>
              Оновити
            </button>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="empty-state">Активних постів за цим фільтром немає.</div>
        ) : (
          <div className="post-grid">
            {posts.map((post) => {
              const mine = account && post.author.toLowerCase() === account.toLowerCase();
              const liked = likedPostIds.has(post.id);
              return (
                <article className="post-card" key={post.id}>
                  <div className="post-meta">
                    <div className="avatar">{post.author.slice(2, 4).toUpperCase()}</div>
                    <div>
                      <strong title={post.author}>{shortAddress(post.author)}</strong>
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                    <span className="post-id">#{post.id}</span>
                  </div>

                  <p className="post-content">{post.content}</p>

                  <div className="post-footer">
                    <button
                      className={`like-button ${liked ? "liked" : ""}`}
                      disabled={!account || busyAction === `like-${post.id}`}
                      onClick={() =>
                        runTransaction(
                          `like-${post.id}`,
                          (contract) =>
                            liked ? contract.unlikePost(post.id) : contract.likePost(post.id),
                          liked ? "Лайк прибрано" : "Лайк додано",
                        )
                      }
                    >
                      <span>{liked ? "♥" : "♡"}</span> {post.likes}
                    </button>

                    {mine && (
                      <button
                        className="delete-post"
                        disabled={busyAction === `delete-${post.id}`}
                        onClick={() =>
                          runTransaction(
                            `delete-${post.id}`,
                            (contract) => contract.deletePost(post.id),
                            "Пост видалено",
                          )
                        }
                      >
                        Видалити
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
