import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

async function deployFixture() {
  const [owner, alice, bob, outsider] = await ethers.getSigners();
  const socialPosts = await ethers.deployContract("SocialPosts");
  await socialPosts.waitForDeployment();
  return { socialPosts, owner, alice, bob, outsider };
}

describe("SocialPosts", function () {
  it("creates posts and stores the author", async function () {
    const { socialPosts, alice } = await networkHelpers.loadFixture(deployFixture);

    await expect(socialPosts.connect(alice).createPost("Hello blockchain"))
      .to.emit(socialPosts, "PostCreated");

    const post = await socialPosts.getPost(0);
    expect(post.content).to.equal("Hello blockchain");
    expect(post.author).to.equal(alice.address);
    expect(post.likes).to.equal(0n);
    expect(await socialPosts.activePostCount()).to.equal(1n);
  });

  it("returns posts only for a concrete author", async function () {
    const { socialPosts, alice, bob } = await networkHelpers.loadFixture(deployFixture);

    await socialPosts.connect(alice).createPost("Alice post 1");
    await socialPosts.connect(bob).createPost("Bob post");
    await socialPosts.connect(alice).createPost("Alice post 2");

    const alicePosts = await socialPosts.getPostsByAuthor(alice.address);
    expect(alicePosts).to.have.length(2);
    expect(alicePosts[0].author).to.equal(alice.address);
    expect(alicePosts[1].author).to.equal(alice.address);
  });

  it("allows only the author to delete a post", async function () {
    const { socialPosts, alice, bob } = await networkHelpers.loadFixture(deployFixture);

    await socialPosts.connect(alice).createPost("Alice post");

    await expect(socialPosts.connect(bob).deletePost(0)).to.be.revertedWith(
      "Only post author",
    );

    await expect(socialPosts.connect(alice).deletePost(0))
      .to.emit(socialPosts, "PostDeleted")
      .withArgs(0n, alice.address);

    expect(await socialPosts.activePostCount()).to.equal(0n);
  });

  it("allows a user to delete all of their own posts", async function () {
    const { socialPosts, alice, bob } = await networkHelpers.loadFixture(deployFixture);

    await socialPosts.connect(alice).createPost("A1");
    await socialPosts.connect(alice).createPost("A2");
    await socialPosts.connect(bob).createPost("B1");

    await expect(socialPosts.connect(alice).deleteMyPosts())
      .to.emit(socialPosts, "MyPostsDeleted")
      .withArgs(alice.address, 2n);

    expect(await socialPosts.activePostCount()).to.equal(1n);
    expect(await socialPosts.getPostsByAuthor(alice.address)).to.have.length(0);
    expect(await socialPosts.getPostsByAuthor(bob.address)).to.have.length(1);
  });

  it("allows only the contract owner to delete all posts", async function () {
    const { socialPosts, owner, alice, bob } = await networkHelpers.loadFixture(deployFixture);

    await socialPosts.connect(alice).createPost("A1");
    await socialPosts.connect(bob).createPost("B1");

    await expect(socialPosts.connect(alice).deleteAllPosts()).to.be.revertedWith(
      "Only owner",
    );

    await expect(socialPosts.connect(owner).deleteAllPosts())
      .to.emit(socialPosts, "AllPostsDeleted")
      .withArgs(owner.address, 2n);

    expect(await socialPosts.activePostCount()).to.equal(0n);
    expect(await socialPosts.getAllPosts()).to.have.length(0);
  });

  it("adds and removes a like", async function () {
    const { socialPosts, alice, bob } = await networkHelpers.loadFixture(deployFixture);

    await socialPosts.connect(alice).createPost("Like me");

    await expect(socialPosts.connect(bob).likePost(0))
      .to.emit(socialPosts, "PostLiked")
      .withArgs(0n, bob.address, 1n);

    expect(await socialPosts.hasLiked(0, bob.address)).to.equal(true);
    expect((await socialPosts.getPost(0)).likes).to.equal(1n);

    await expect(socialPosts.connect(bob).unlikePost(0))
      .to.emit(socialPosts, "PostUnliked")
      .withArgs(0n, bob.address, 0n);

    expect(await socialPosts.hasLiked(0, bob.address)).to.equal(false);
    expect((await socialPosts.getPost(0)).likes).to.equal(0n);
  });

  it("rejects duplicate likes and invalid unlikes", async function () {
    const { socialPosts, alice, bob } = await networkHelpers.loadFixture(deployFixture);

    await socialPosts.connect(alice).createPost("Test post");
    await socialPosts.connect(bob).likePost(0);

    await expect(socialPosts.connect(bob).likePost(0)).to.be.revertedWith(
      "Already liked",
    );

    await socialPosts.connect(bob).unlikePost(0);

    await expect(socialPosts.connect(bob).unlikePost(0)).to.be.revertedWith(
      "Post is not liked",
    );
  });

  it("does not allow liking a deleted post", async function () {
    const { socialPosts, alice, bob } = await networkHelpers.loadFixture(deployFixture);

    await socialPosts.connect(alice).createPost("Soon deleted");
    await socialPosts.connect(alice).deletePost(0);

    await expect(socialPosts.connect(bob).likePost(0)).to.be.revertedWith(
      "Post is deleted",
    );
  });
});
