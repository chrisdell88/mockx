import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";
import { useToast } from "./use-toast";

function safeParse<T>(schema: z.ZodType<any>, data: unknown, fallback: T): T {
  try {
    const result = schema.safeParse(data);
    if (!result.success) {
      console.warn("[Zod Validation Error]:", result.error.format());
      return data as T;
    }
    return result.data;
  } catch (e) {
    return data as T;
  }
}

export function useMockDrafts() {
  return useQuery({
    queryKey: [api.mockDrafts.list.path],
    queryFn: async () => {
      const res = await fetch(api.mockDrafts.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch mock drafts");
      const data = await res.json();
      return safeParse<z.infer<typeof api.mockDrafts.list.responses[200]>>(
        api.mockDrafts.list.responses[200],
        data,
        data
      );
    },
  });
}

export function useScrapeMockDraft() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: z.infer<typeof api.mockDrafts.scrape.input>) => {
      const res = await fetch(api.mockDrafts.scrape.path, {
        method: api.mockDrafts.scrape.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 400) {
          throw new Error(data.message || "Invalid input");
        }
        throw new Error("Failed to scrape mock draft");
      }
      
      return data as z.infer<typeof api.mockDrafts.scrape.responses[201]>;
    },
    onSuccess: (data) => {
      toast({
        title: "Scrape Successful",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: [api.mockDrafts.list.path] });
      // Invalidate players too since their ADPs might have changed
      queryClient.invalidateQueries({ queryKey: [api.players.list.path] });
    },
    onError: (error: Error) => {
      toast({
        title: "Scrape Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}
