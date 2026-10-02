export const SOCIAL_POSTS_ABI = [
  "function owner() view returns (address)",
  "function createPost(string content)",
  "function getAllPosts() view returns (tuple(uint256 id, string content, address author, uint256 createdAt, uint256 likes, bool deleted)[])",
  "function getPostsByAuthor(address author) view returns (tuple(uint256 id, string content, address author, uint256 createdAt, uint256 likes, bool deleted)[])",
  "function deletePost(uint256 postId)",
  "function deleteMyPosts() returns (uint256 deletedCount)",
  "function deleteAllPosts() returns (uint256 deletedCount)",
  "function likePost(uint256 postId)",
  "function unlikePost(uint256 postId)",
  "function hasLiked(uint256 postId, address user) view returns (bool)",
  "function activePostCount() view returns (uint256)",
  "event PostCreated(uint256 indexed postId, address indexed author, string content, uint256 createdAt)",
  "event PostDeleted(uint256 indexed postId, address indexed author)",
  "event PostLiked(uint256 indexed postId, address indexed user, uint256 likes)",
  "event PostUnliked(uint256 indexed postId, address indexed user, uint256 likes)"
];

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
