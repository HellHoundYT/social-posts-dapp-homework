// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SocialPosts {
    struct Post {
        uint256 id;
        string content;
        address author;
        uint256 createdAt;
        uint256 likes;
        bool deleted;
    }

    address public immutable owner;
    uint256 public nextPostId;
    uint256 public activePostCount;

    mapping(uint256 => Post) private posts;
    mapping(uint256 => mapping(address => bool)) private likedBy;
    mapping(address => uint256[]) private authorPostIds;

    event PostCreated(
        uint256 indexed postId,
        address indexed author,
        string content,
        uint256 createdAt
    );
    event PostDeleted(uint256 indexed postId, address indexed author);
    event PostLiked(uint256 indexed postId, address indexed user, uint256 likes);
    event PostUnliked(uint256 indexed postId, address indexed user, uint256 likes);
    event MyPostsDeleted(address indexed author, uint256 deletedCount);
    event AllPostsDeleted(address indexed owner, uint256 deletedCount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier existingPost(uint256 postId) {
        require(postId < nextPostId, "Post does not exist");
        require(!posts[postId].deleted, "Post is deleted");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createPost(string calldata content) external {
        require(bytes(content).length > 0, "Content is required");

        uint256 postId = nextPostId;
        posts[postId] = Post({
            id: postId,
            content: content,
            author: msg.sender,
            createdAt: block.timestamp,
            likes: 0,
            deleted: false
        });

        authorPostIds[msg.sender].push(postId);
        nextPostId += 1;
        activePostCount += 1;

        emit PostCreated(postId, msg.sender, content, block.timestamp);
    }

    function getPost(uint256 postId)
        external
        view
        existingPost(postId)
        returns (Post memory)
    {
        return posts[postId];
    }

    function getAllPosts() external view returns (Post[] memory) {
        Post[] memory result = new Post[](activePostCount);
        uint256 resultIndex;

        for (uint256 i = 0; i < nextPostId; i++) {
            if (!posts[i].deleted) {
                result[resultIndex] = posts[i];
                resultIndex += 1;
            }
        }

        return result;
    }

    function getPostsByAuthor(address author)
        external
        view
        returns (Post[] memory)
    {
        uint256[] storage ids = authorPostIds[author];
        uint256 count;

        for (uint256 i = 0; i < ids.length; i++) {
            if (!posts[ids[i]].deleted) {
                count += 1;
            }
        }

        Post[] memory result = new Post[](count);
        uint256 resultIndex;

        for (uint256 i = 0; i < ids.length; i++) {
            uint256 postId = ids[i];
            if (!posts[postId].deleted) {
                result[resultIndex] = posts[postId];
                resultIndex += 1;
            }
        }

        return result;
    }

    function deletePost(uint256 postId) external existingPost(postId) {
        Post storage post = posts[postId];
        require(msg.sender == post.author, "Only post author");

        post.deleted = true;
        activePostCount -= 1;

        emit PostDeleted(postId, msg.sender);
    }

    function deleteMyPosts() external returns (uint256 deletedCount) {
        uint256[] storage ids = authorPostIds[msg.sender];

        for (uint256 i = 0; i < ids.length; i++) {
            uint256 postId = ids[i];
            if (!posts[postId].deleted) {
                posts[postId].deleted = true;
                activePostCount -= 1;
                deletedCount += 1;
                emit PostDeleted(postId, msg.sender);
            }
        }

        emit MyPostsDeleted(msg.sender, deletedCount);
    }

    function deleteAllPosts()
        external
        onlyOwner
        returns (uint256 deletedCount)
    {
        for (uint256 i = 0; i < nextPostId; i++) {
            if (!posts[i].deleted) {
                posts[i].deleted = true;
                deletedCount += 1;
                emit PostDeleted(i, posts[i].author);
            }
        }

        activePostCount = 0;
        emit AllPostsDeleted(msg.sender, deletedCount);
    }

    function likePost(uint256 postId) external existingPost(postId) {
        require(!likedBy[postId][msg.sender], "Already liked");

        likedBy[postId][msg.sender] = true;
        posts[postId].likes += 1;

        emit PostLiked(postId, msg.sender, posts[postId].likes);
    }

    function unlikePost(uint256 postId) external existingPost(postId) {
        require(likedBy[postId][msg.sender], "Post is not liked");

        likedBy[postId][msg.sender] = false;
        posts[postId].likes -= 1;

        emit PostUnliked(postId, msg.sender, posts[postId].likes);
    }

    function hasLiked(uint256 postId, address user)
        external
        view
        returns (bool)
    {
        require(postId < nextPostId, "Post does not exist");
        return likedBy[postId][user];
    }
}
