import { createServerSideHelpers } from "@trpc/react-query/server"
import SuperJSON from "superjson"
import { createInnerTRPCContext } from "./trpc"
import { appRouter } from "./root"

export function ssgHelper() {
    return createServerSideHelpers({
        router: appRouter,
        ctx: createInnerTRPCContext({ session: null, revalidateSSG: null }), //no user info so you pass null
        transformer: SuperJSON
    })
}