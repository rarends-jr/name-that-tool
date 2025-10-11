import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
// import { generateCsrfToken, getCookie, setCookie, verifyCsrf } from "@/lib/csrfMiddleware";

//I don't think this ai-generate csrf logic is how I want it to work, I think nextjs has actually middleware that can override routes instead of needed to be implemented every time
export async function POST(req: Request) {
  // // CSRF check
  // if (!verifyCsrf(req)) {
  //   return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  // }

  await dbConnect();
  try {
    let json = await req.json();
    const room = await Room.create(json);
    return NextResponse.json({ success: true, data: room }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function GET(req: Request) {
  await dbConnect();
  try {
    let json: Record<string, any> = { active: true};

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (code) {
       json.code = code;
    }
    const rooms = await Room.find(json);
    if (rooms.length === 1){
      return NextResponse.json({ success: true, data: rooms[0]}, { status: 200 }); 
    }else{
      return NextResponse.json({ error: "Room Not Found" }, { status: 404 });
    }
    // // Generate CSRF token and set cookie
    // const csrfToken = generateCsrfToken();
    // const res = NextResponse.json({ success: true, data: rooms, csrfToken }, { status: 200 });
    // setCookie(res, "csrfToken", csrfToken);
    // return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}