-- Public blog search uses Prisma's full-text `search` mode over these fields.
-- Keep this as a Prisma migration so clean environments and deploys converge.
ALTER TABLE `posts`
  ADD FULLTEXT INDEX `posts_title_excerpt_fulltext_idx` (`title`, `excerpt`);
