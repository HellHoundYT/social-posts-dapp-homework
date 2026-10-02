import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SocialPostsModule", (m) => {
  const socialPosts = m.contract("SocialPosts");
  return { socialPosts };
});
