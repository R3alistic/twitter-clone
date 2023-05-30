import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const profileRouter = createTRPCRouter({
  //public route specify input object with id string; query async function input
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({
      input: { id }, ctx }) => {
      //store user id
      const currentUserId = ctx.session?.user.id
      //findunique id
      const profile = await ctx.prisma.user.findUnique({
        where: { id },
        select: {
          name: true,
          image: true,
          _count: { select: { followers: true, follows: true, tweets: true } },
          followers:
            currentUserId == null
              ? undefined
              : { where: { id: currentUserId } }, //checks if user has a follower with same ID
        }
      });
      if (profile == null) return
      return {
        name: profile.name,
        image: profile.image,
        followersCount: profile._count.followers,
        followsCount: profile._count.follows,
        tweetsCount: profile._count.tweets,
        isFollowing: profile.followers.length > 0
      }
    }),
  toggleFollow: protectedProcedure.input(z.object({ userId: z.string() }))
    .mutation(async ({ input: { userId }, ctx }) => {
      const currentUserId = ctx.session.user.id
      //find first where the user ID is my own user ID
      const existingFollow = await ctx.prisma.user.findFirst({
        //check the followers to see if some of them have the currentUserId
        where: { id: userId, followers: { some: { id: currentUserId } } },
      });
      let addedFollow
      if (existingFollow == null) {
        await ctx.prisma.user.update({
          where: { id: userId },
          data: { followers: { connect: { id: currentUserId } } }, // connect adds a row
        });
        addedFollow = true
      } else {
        await ctx.prisma.user.update({
          where: { id: userId },
          data: { followers: { disconnect: { id: currentUserId } } }, // connect adds a row
        });
        addedFollow = false
      }

      //Revalidation; this makes sure that the first time follows are loaded that it doesn't load the first iteration all the time
      void ctx.revalidateSSG?.(`/profiles/${userId}`)
      void ctx.revalidateSSG?.(`/profiles/${currentUserId}`)

      return { addedFollow }
    })
});
