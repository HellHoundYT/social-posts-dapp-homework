# Social Posts DApp Homework

Домашня робота: Solidity контракт + React frontend для постів.

## Реалізовано

1. Відображення постів лише конкретного автора через `getPostsByAuthor(address)`.
2. Видалення одного поста тільки його автором через `deletePost(postId)`.
3. Видалення всіх власних постів через `deleteMyPosts()`.
4. Додатково: глобальне `deleteAllPosts()` доступне лише власнику контракту, щоб звичайний користувач не міг стерти чужі записи.
5. Лайк і видалення лайка через `likePost(postId)` / `unlikePost(postId)`.
6. Перевірка, чи поставив конкретний користувач лайк: `hasLiked(postId, user)`.
7. React frontend з картками постів, textarea/input, кнопками, фільтром автора та MetaMask.

## Стек

- Solidity `0.8.28`
- Hardhat 3 + Mocha + ethers
- React 19
- Vite 8
- ethers v6

## Структура

```text
contracts/SocialPosts.sol
test/SocialPosts.test.ts
ignition/modules/SocialPosts.ts
hardhat.config.ts
frontend/src/App.jsx
frontend/src/contract.js
frontend/src/styles.css
```

## Запуск контракту

Потрібен Node.js 22+.

```bash
npm install
npx hardhat build
npx hardhat test
```

Локальна мережа:

```bash
npx hardhat node
```

В іншому терміналі:

```bash
npx hardhat ignition deploy ./ignition/modules/SocialPosts.ts --network localhost
```

Скопіюйте адресу `SocialPostsModule#SocialPosts`.

## Запуск frontend

```bash
cd frontend
npm install
```

Скопіюйте `.env.example` у `.env` та вставте адресу контракту:

```env
VITE_CONTRACT_ADDRESS=0x...
```

Після цього:

```bash
npm run dev
```

Для MetaMask додайте локальну мережу:

```text
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency: ETH
```

## Перевірка вимог

### Пости конкретного автора

Frontend викликає:

```solidity
getPostsByAuthor(address author)
```

### Видалення

Один пост може видалити тільки автор:

```solidity
deletePost(uint256 postId)
```

Усі власні пости:

```solidity
deleteMyPosts()
```

Глобальне очищення всіх постів реалізовано окремо і захищено `onlyOwner`:

```solidity
deleteAllPosts()
```

### Лайки

```solidity
likePost(uint256 postId)
unlikePost(uint256 postId)
hasLiked(uint256 postId, address user)
```

Один акаунт не може поставити один і той самий лайк двічі.
