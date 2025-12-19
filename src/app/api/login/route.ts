import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock validation
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        // Mock authentication - accept any valid email format
        if (!email.includes("@")) {
            return NextResponse.json(
                { error: "Invalid email format" },
                { status: 400 }
            );
        }

        // Mock successful login
        const user = {
            id: "user_" + Math.random().toString(36).substr(2, 9),
            name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
            email: email,
            avatar: null,
        };

        return NextResponse.json({ user, message: "Login successful" });
    } catch {
        return NextResponse.json(
            { error: "An error occurred during login" },
            { status: 500 }
        );
    }
}
