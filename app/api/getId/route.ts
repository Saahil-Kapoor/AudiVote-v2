import { prismaClient } from "@/app/lib/db";
import { auth } from "@/auth";
import {NextResponse } from "next/server";


export async function GET(){
    const session = await auth();
    
    const user = await prismaClient.user.findFirst({
        where:{
            email:session?.user?.email??""
        }
    })
    console.log(session.user.email);

    if(!user){
        return NextResponse.json({
            message:"Unauthenticated"
        },{
            status:411
        })
    }
    return NextResponse.json({
        id: user.id
    }, {
        status: 200
    });
}