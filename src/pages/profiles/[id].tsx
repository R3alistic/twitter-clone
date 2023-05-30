/* eslint-disable @next/next/no-title-in-document-head */
/* eslint-disable @next/next/no-document-import-in-page */
import { type InferGetStaticPropsType, type GetStaticPropsContext, type NextPage, type GetStaticPaths } from "next";
import Head from "next/head";
import { ssgHelper } from "~/server/api/ssgHelper";
import { api } from "~/utils/api";
import ErrorPage from "next/error"
import Link from "next/link";
import { VscArrowLeft } from "react-icons/vsc";
import { IconHoverEffect } from "~/components/IconHoverEffect";
import { ProfileImage } from "~/components/ProfileImage";
import { InfiniteTweetList } from "~/components/InfiniteTweetList";
import { Button } from "~/components/Button";
import { useSession } from "next-auth/react";

//serverside render the entire page would be a solution here but incremental static site generation is more fitting since our info doesn't change much
//generic types to get props from getStaticProps function return value
const ProfilePage: NextPage<InferGetStaticPropsType<typeof getStaticProps>> =
    ({
        id
    }) => {
        const { data: profile } = api.profile.getById.useQuery({ id })
        const tweets = api.tweet.infiniteProfileFeed.useInfiniteQuery(
            { userId: id },
            { getNextPageParam: (lastPage) => lastPage.nextCursor })

        const trpcUtils = api.useContext();

        const toggleFollow = api.profile.toggleFollow.useMutation({
            onSuccess: ({ addedFollow }) => {
                trpcUtils.profile.getById.setData({ id }, oldData => {
                    if (oldData == null) return
                    const countModifier = addedFollow ? 1 : -1
                    return {
                        ...oldData,
                        isFollowing: addedFollow,
                        followersCount: oldData.followersCount + countModifier
                    }
                })
            }
        });
        if (profile == null || profile.name == null) {
            return <ErrorPage statusCode={404} />
        }
        return (
            <>
                <Head>
                    <title>{`Twitter Clone ${profile.name}`}</title>
                </Head>
                <header className="sticky top-0 z-10 flex items-center border-b bg-white
            px-4 py-2">
                    <Link href=".." className="mr-2">
                        <IconHoverEffect>
                            <VscArrowLeft className="h-6 w-6" />
                        </IconHoverEffect>
                    </Link>
                    <ProfileImage src={profile.image} className="flex-shrink-0" />
                    <div className="ml-2 flex-grow">
                        <h1 className="text-lg font-bold">{profile.name}</h1>
                        <div className="text-gray-500">
                            {profile.tweetsCount}{" "}
                            {getPlural(profile.tweetsCount, "Tweet", "Tweets")} - {" "}
                            {profile.followersCount}{" "}
                            {getPlural(profile.followersCount, "Follower", "Followers")} - {" "}
                            {profile.followsCount} Following
                        </div>
                    </div>
                    <FollowButton
                        isFollowing={profile.isFollowing}
                        isLoading={toggleFollow.isLoading}
                        userId={id}
                        onClick={() => toggleFollow.mutate({ userId: id })} />
                </header>
                <main>
                    <InfiniteTweetList
                        tweets={tweets.data?.pages.flatMap((page) => page.tweets)}
                        isError={tweets.isError}
                        isLoading={tweets.isLoading}
                        hasMore={tweets.hasNextPage}
                        fetchNewTweets={tweets.fetchNextPage}
                    />
                </main>
            </>
        )
    }

function FollowButton({
    userId,
    isFollowing,
    isLoading,
    onClick,
}: {
    userId: string,
    isFollowing: boolean,
    isLoading: boolean,
    onClick: () => void
}) {
    const session = useSession()

    if (session.status !== "authenticated" || session.data.user.id === userId) {
        return null
    }
    return (
        <Button disabled={isLoading} onClick={onClick} small gray={isFollowing}>
            {isFollowing ? "Unfollow" : "Follow"}
        </Button>
    )
}

const pluralRules = new Intl.PluralRules()
function getPlural(number: number, singular: string, plural: string) {
    return pluralRules.select(number) === "one" ? singular : plural
}


//tell what pages to generate
export const getStaticPaths: GetStaticPaths = () => {
    return {
        //dont generate any pages by default
        paths: [],
        //when you request a non existing page, block it and store it in the cache
        fallback: "blocking"
    }
}

export async function getStaticProps(context: GetStaticPropsContext<{ id: string }>) {
    const id = context.params?.id

    if (id == null) {
        return {
            redirect: {
                destination: "/"
            }
        }
    }
    const ssg = ssgHelper() //prefetches some data and automatically renders it to our page
    //prefetch all this data for statically generating my website whenever I want
    await ssg.profile.getById.prefetch({ id })

    return {
        props: {
            id,
            //dehydrate now to rehydrate front end with static info
            trpcState: ssg.dehydrate(),
        }
    }
}

export default ProfilePage