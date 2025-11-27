import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, encrypt } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newUsername, newPassword } = body;

    if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid current password' }, { status: 400 });
    }

    const data: any = {};

    if (newUsername && newUsername !== user.username) {
        // Check if taken
        const existing = await prisma.user.findUnique({ where: { username: newUsername }});
        if (existing) {
            return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
        }
        data.username = newUsername;
    }

    if (newPassword) {
        data.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ success: true }); // Nothing to update
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    // Update session
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const newSession = await encrypt({ user: { id: updatedUser.id, username: updatedUser.username }, expires });
    
    const response = NextResponse.json({ success: true });
    response.cookies.set('session', newSession, { expires, httpOnly: true });

    return response;
  } catch (error) {
    console.error('Update account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
