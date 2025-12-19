import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { email, password, name } = await request.json();

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1200));

        // Mock validation
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        if (!email.includes("@")) {
            return NextResponse.json(
                { error: "Invalid email format" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        // Mock successful signup
        const user = {
            id: "user_" + Math.random().toString(36).substr(2, 9),
            name: name || email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
            email: email,
            avatar: null,
        };

        return NextResponse.json({ user, message: "Account created successfully" });
    } catch {
        return NextResponse.json(
            { error: "An error occurred during signup" },
            { status: 500 }
        );
    }
}
