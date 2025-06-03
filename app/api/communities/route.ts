import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    // Optionally, return all communities if no query, or an empty array/error
    // For now, let's return empty for a missing query to enforce query-based suggestions
    return NextResponse.json([]); 
  }
  try {
    const communityLimit = 3;
    const userLimit = 3;

    const communities = await prisma.subpost.findMany({
      where: {
        name: {
          contains: q,
          mode: 'insensitive',
        },
      },
      select: {
        name: true,
      },
      take: communityLimit,
      orderBy: {
        // Could order by relevance or activity later if needed
        createdAt: 'desc',
      },
    });

    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            userName: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            fullName: {
              contains: q,
              mode: 'insensitive',
            },
          },
        ],
        profileComplete: true, // Only suggest completed profiles
      },
      select: {
        userName: true,
        fullName: true,
        imageUrl: true,
      },
      take: userLimit,
      orderBy: {
        updatedAt: 'desc', // Or by relevance if a scoring system is introduced
      },
    });

    const formattedCommunities = communities.map(community => ({
      type: 'community' as const,
      name: community.name.startsWith('bhub/') ? community.name.substring(5) : community.name,
      link: `/p/${community.name.startsWith('bhub/') ? community.name.substring(5) : community.name}`,
    }));

    const formattedUsers = users.map(user => ({
      type: 'user' as const,
      name: `${user.fullName || ''} (${user.userName ? '@' + user.userName : ''})`.trim(),
      userName: user.userName, // Keep for link generation
      link: `/profile/${user.userName}`,
      imageUrl: user.imageUrl,
    }));

    // Combine and potentially interleave results or keep them grouped
    const suggestions = [...formattedCommunities, ...formattedUsers];
    // For now, simple concatenation. Could add logic to sort or limit total.

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Error fetching communities:", error);
    return NextResponse.json(
      { error: "Failed to fetch communities" },
      { status: 500 }
    );
  }
}
