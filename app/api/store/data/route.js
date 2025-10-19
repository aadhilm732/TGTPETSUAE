import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";


//Get store info & products
export async function GET(request){
    try {
        // get username from query params
        const {searchParams}= new URL(request.url)
        const username = searchParams.get('username').toLocaleLowerCase();

        if (!username) {
            return NextResponse.json({error: "Missing usernmae"}, {status: 400})
        }

        //Get store info and instock products with rating
        const store = await prisma.store.findUnique({
            where: {username, isActive: true},
            include: {Product: {include: {rating: true}}}
        })

        if (!store) {
            return NextResponse.json({error: "store not found"}, {status: 400})
        }

        return NextResponse.json({store})
    } catch (error) {
        console.error(error)
        return NextResponse.json({error: error.code || error.message}, {status: 400})
    }
}