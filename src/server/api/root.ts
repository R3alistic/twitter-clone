import { createTRPCRouter } from "~/server/api/trpc";
import { tweetRouter } from "~/server/api/routers/tweet";
import { profileRouter } from "./routers/profile";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({ //Here I replaced the default stuff with tweet
  tweet: tweetRouter,
  profile: profileRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
