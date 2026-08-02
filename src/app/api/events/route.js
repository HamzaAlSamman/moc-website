import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Auto-update expired events to COMPLETED
    await prisma.event.updateMany({
      where: {
        status: { in: ["UPCOMING", "ONGOING"] },
        OR: [
          {
            endDate: { lt: now }
          },
          {
            endDate: null,
            startDate: { lt: startOfToday }
          }
        ]
      },
      data: {
        status: "COMPLETED"
      }
    });

    const events = await prisma.event.findMany({
      // Only approved events reach the public cultural calendar — pending and
      // rejected (DIRECTORATE-submitted) events stay out of public view.
      where:   { status: { in: ["UPCOMING", "ONGOING", "COMPLETED"] }, reviewStatus: "APPROVED" },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        titleAr: true,
        titleEn: true,
        descriptionAr: true,
        descriptionEn: true,
        location: true,
        locationEn: true,
        governorate: true,
        governorateEn: true,
        startDate: true,
        endDate: true,
        featuredImage: true,
        status: true,
        // Provenance + booking deep-link for events mirrored from partner sites
        // (e.g. the Damascus Opera House) so the calendar can show a "Book now"
        // button that hands off to the partner's own booking flow.
        source: true,
        bookingUrl: true,
        eventKindId: true,
        eventKind: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            color: true,
          }
        },
        eventCategoryId: true,
        eventCategory: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            color: true
          }
        }
      },
    });

    return NextResponse.json(events);
  } catch (err) {
    console.error("Fetch events error:", err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
