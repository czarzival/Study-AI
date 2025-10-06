import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, content } = await req.json();

    if (!documentId || !content) {
      return new Response(
        JSON.stringify({ error: "Missing documentId or content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get document and user info
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("user_id, title")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      throw new Error("Document not found");
    }

    console.log("Generating notes for document:", documentId);

    // Generate summary notes using Lovable AI
    const notesResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert study assistant. Create concise, well-organized study notes from the provided content. Extract key concepts, important facts, and main ideas. Format the response as clear, structured notes.",
          },
          {
            role: "user",
            content: `Create comprehensive study notes from this content:\n\n${content}`,
          },
        ],
      }),
    });

    if (!notesResponse.ok) {
      const errorText = await notesResponse.text();
      console.error("AI gateway error:", notesResponse.status, errorText);
      
      if (notesResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (notesResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("Failed to generate notes");
    }

    const notesData = await notesResponse.json();
    const notesContent = notesData.choices[0].message.content;

    // Extract keywords using AI
    const keywordsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Extract 5-7 important keywords or key concepts from the provided content. Return ONLY a comma-separated list of keywords, nothing else.",
          },
          {
            role: "user",
            content: content,
          },
        ],
      }),
    });

    const keywordsData = await keywordsResponse.json();
    const keywordsText = keywordsData.choices[0].message.content;
    const keywords = keywordsText.split(",").map((k: string) => k.trim()).filter(Boolean);

    // Insert notes into database
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .insert({
        user_id: document.user_id,
        document_id: documentId,
        title: document.title,
        content: notesContent,
        keywords,
      })
      .select()
      .single();

    if (noteError) throw noteError;

    console.log("Generated notes, now generating flashcards");

    // Generate flashcards using AI
    const flashcardsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert at creating study flashcards. Generate 5-10 question-answer pairs from the provided content. Format each flashcard as 'Q: [question] | A: [answer]' on separate lines. Make questions clear and concise, and answers should be brief but complete.",
          },
          {
            role: "user",
            content: `Create study flashcards from these notes:\n\n${notesContent}`,
          },
        ],
      }),
    });

    const flashcardsData = await flashcardsResponse.json();
    const flashcardsText = flashcardsData.choices[0].message.content;

    // Parse flashcards
    const flashcardLines = flashcardsText.split("\n").filter((line: string) => line.includes("Q:") && line.includes("A:"));
    
    interface FlashcardInsert {
      user_id: string;
      note_id: string;
      question: string;
      answer: string;
      difficulty: string;
    }
    
    const flashcardsToInsert = flashcardLines.map((line: string): FlashcardInsert => {
      const parts = line.split("|");
      const question = parts[0]?.replace("Q:", "").trim() || "";
      const answer = parts[1]?.replace("A:", "").trim() || "";
      
      // Simple difficulty estimation based on answer length
      let difficulty = "medium";
      if (answer.length < 50) difficulty = "easy";
      if (answer.length > 150) difficulty = "hard";

      return {
        user_id: document.user_id,
        note_id: note.id,
        question,
        answer,
        difficulty,
      };
    }).filter((card: FlashcardInsert) => card.question && card.answer);

    // Insert flashcards
    if (flashcardsToInsert.length > 0) {
      const { error: flashcardsError } = await supabase
        .from("flashcards")
        .insert(flashcardsToInsert);

      if (flashcardsError) {
        console.error("Error inserting flashcards:", flashcardsError);
      }
    }

    console.log("Successfully generated notes and flashcards");

    return new Response(
      JSON.stringify({
        success: true,
        noteId: note.id,
        flashcardsCount: flashcardsToInsert.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in generate-notes function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
