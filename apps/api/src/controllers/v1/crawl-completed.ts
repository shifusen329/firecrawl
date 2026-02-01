import { Response } from "express";
import {
  CompletedCrawlsResponse,
  RequestWithAuth,
  toNewCrawlerOptions,
} from "./types";
import { getCrawl } from "../../lib/crawl-redis";
import { crawlGroup } from "../../services/worker/nuq";

export async function completedCrawlsController(
  req: RequestWithAuth<{}, undefined, CompletedCrawlsResponse>,
  res: Response<CompletedCrawlsResponse>,
) {
  const ids = (await crawlGroup.getCompletedByOwner(req.auth.team_id)).map(
    x => x.id,
  );

  const crawls = (
    await Promise.all(ids.map(async id => ({ ...(await getCrawl(id)), id })))
  ).filter(crawl => crawl !== null && !crawl.cancelled);

  res.status(200).json({
    success: true,
    crawls: crawls.map(x => ({
      id: x.id,
      teamId: x.team_id!,
      url:
        x.originUrl ??
        ((x.scrapeOptions as any)?.urls
          ? (x.scrapeOptions as any).urls[0]
          : "Batch Scrape"),
      status: "completed",
      created_at: new Date(x.createdAt || Date.now()).toISOString(),
      options: {
        ...(x.crawlerOptions ? toNewCrawlerOptions(x.crawlerOptions) : {}),
        scrapeOptions: x.scrapeOptions,
      } as any,
    })),
  });
}
