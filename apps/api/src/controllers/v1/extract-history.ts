import { Response } from "express";
import { RequestWithAuth } from "./types";
import { supabase_service } from "../../services/supabase";
import { config } from "../../config";

export type ExtractHistoryResponse =
  | { success: false; error: string }
  | {
      success: true;
      data: {
        id: string;
        urls: string[];
        is_successful: boolean;
        model_kind: string;
        created_at: string;
      }[];
    };

export async function extractHistoryController(
  req: RequestWithAuth<{}, undefined, ExtractHistoryResponse>,
  res: Response<ExtractHistoryResponse>,
) {
  if (!config.USE_DB_AUTHENTICATION) {
    return res.status(400).json({
      success: false,
      error: "Database authentication is not enabled",
    });
  }

  try {
    const { data, error } = await supabase_service
      .from("extracts")
      .select("id, urls, is_successful, model_kind, created_at")
      .eq("team_id", req.auth.team_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({
        success: false,
        error: `Failed to fetch extract history: ${error.message}`,
      });
    }

    res.status(200).json({
      success: true,
      data: data || [],
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to fetch extract history: ${err.message}`,
    });
  }
}
