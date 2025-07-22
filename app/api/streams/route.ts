import { prismaClient } from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";

import youtubesearchapi from "youtube-search-api";

const urlRegex = /^(?:(?:https?:)?\/\/)?(?:www\.)?(?:m\.)?(?:youtu(?:be)?\.com\/(?:v\/|embed\/|watch(?:\/|\?v=))|youtu\.be\/)((?:\w|-){11})(?:\S+)?$/;

export async function POST(req: NextRequest) {
    try {
        const creatorId = req.nextUrl.searchParams.get("creatorId");
        if (!creatorId) {
            return NextResponse.json({
                message: "Missing creatorId"
            }, {
                status: 400
            })
        }
        //const session = await getServerSession();
        /*
                const user = await prismaClient.user.findFirst({
                    where: {
                        email: session?.user?.email ?? ""
                    }
                })
                if (!user) {
                    return NextResponse.json({
                        message: "Unauthenticated"
                    }, {
                        status: 411
                    })
                }
                    
                */
        //const data = CreateStreamSchema.parse(await req.json());
        const data = await req.json();
        const isYt = data.url.match(urlRegex);
        if (!isYt) {
            return NextResponse.json({
                message: "Error pasted a wrong link"
            }, {
                status: 411
            })
        }
        if (data.url.includes("youtu.be/")) {
            const id = data.url.split("youtu.be/")[1].split(/[?&]/)[0]; // remove query params
            data.url = `https://www.youtube.com/watch?v=${id}`;
        }

        const match = data.url.match(/[?&]v=([^&]+)/);
        const extractedId = match ? match[1] : null;
        const dt = await youtubesearchapi.GetVideoDetails(extractedId);
        console.log(dt);
        const title = dt.title;
        let smallImg = "";
        let bigImg = "";
        if (dt.thumbnail === undefined || dt.thumbnail.thumbnails.length < 2) {
            smallImg = "https://media.istockphoto.com/id/1175435360/vector/music-note-icon-vector-illustration.jpg?s=612x612&w=0&k=20&c=R7s6RR849L57bv_c7jMIFRW4H87-FjLB8sqZ08mN0OU=";
            bigImg = "https://media.istockphoto.com/id/1175435360/vector/music-note-icon-vector-illustration.jpg?s=612x612&w=0&k=20&c=R7s6RR849L57bv_c7jMIFRW4H87-FjLB8sqZ08mN0OU=";
        }
        else {
            const length = dt.thumbnail.thumbnails.length;
            smallImg = dt.thumbnail.thumbnails[length - 2].url;
            bigImg = dt.thumbnail.thumbnails[length - 1].url;
        }

        const stream = await prismaClient.stream.create({
            data: {
                userId: creatorId ?? '',
                url: data.url,
                title: title,
                smallImg: smallImg,
                bigImg: bigImg,
                extractedId: extractedId,
                type: "Youtube"
            }
        });

        return NextResponse.json({
            message: "Added Streams",
            id: stream.id,
            title: title,
            smallImg: smallImg,
        })

    }
    catch (e) {
        console.error("Error while adding a stream:", e);
        return NextResponse.json({
            message: "Error while adding a stream"
        }, {
            status: 411
        })
    }
}

export async function GET(req: NextRequest) {
    const creatorId = req.nextUrl.searchParams.get("creatorId");
    if (!creatorId) {
        return NextResponse.json({
            message: "Missing creatorId"
        }, {
            status: 400
        })
    }
    const streams = await prismaClient.stream.findMany({
        where: {
            userId: creatorId ?? ""
        },
        include: {
            _count: {
                select: {
                    upvotes: true
                }
            },
            upvotes: true
        },
        orderBy: {
            upvotes: {
                _count: 'desc'
            }
        }
    })
    //console.log(streams);
    return NextResponse.json({
        streams: streams
    })
}