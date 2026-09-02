const MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

function clean(value, fallback = "Nieznane") {
  if (value === null || value === undefined) return fallback;

  const text = String(value)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  return text || fallback;
}

function clampConfidence(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.min(100, Math.round(number)));
}

function extractJSON(text) {
  if (!text) return null;

  let cleaned = String(text)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {}

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {}
  }

  return null;
}

function normalizeResult(data) {
  if (!data || typeof data !== "object") {
    return {
      ok: true,
      identifiable: false,
      confidence: 0,
      brand: "Nie rozpoznano",
      model: "Nie udało się rozpoznać auta",
      generation: "Nieznana",
      body: "Nieznane",
      engine: "Nieznany",
      drive: "Nieznany",
      year: "Nieznany",
      color: "Nieznany",
      notes:
        "AI nie ma wystarczającej pewności, aby wiarygodnie zidentyfikować samochód.",
    };
  }

  const confidence = clampConfidence(data.confidence);

  const identifiable =
    data.identifiable === true ||
    (confidence >= 55 &&
      clean(data.brand, "") !== "" &&
      clean(data.model, "") !== "");

  if (!identifiable || confidence < 45) {
    return {
      ok: true,
      identifiable: false,
      confidence,
      brand: "Nie rozpoznano",
      model: "Nie udało się wiarygodnie rozpoznać auta",
      generation: "Nieznana",
      body: "Nieznane",
      engine: "Nieznany",
      drive: "Nieznany",
      year: "Nieznany",
      color: clean(data.color),
      notes:
        clean(
          data.notes,
          "Zdjęcie nie daje wystarczającej pewności. Spróbuj zrobić wyraźniejsze zdjęcie całego samochodu."
        ),
    };
  }

  return {
    ok: true,
    identifiable: true,
    confidence,

    brand: clean(data.brand),
    model: clean(data.model),
    generation: clean(data.generation),
    body: clean(data.body),
    engine: clean(data.engine),
    drive: clean(data.drive),
    year: clean(data.year),
    color: clean(data.color),

    notes: clean(
      data.notes,
      "Rozpoznanie zostało wykonane na podstawie wyglądu samochodu."
    ),
  };
}

function extractModelResponse(response) {
  if (!response) return "";

  if (typeof response === "string") return response;

  if (typeof response.response === "string") {
    return response.response;
  }

  if (typeof response.result === "string") {
    return response.result;
  }

  if (typeof response.text === "string") {
    return response.text;
  }

  if (response.result && typeof response.result.response === "string") {
    return response.result.response;
  }

  return JSON.stringify(response);
}

export default {
  async fetch(request, env) {
    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Health check
    if (request.method === "GET") {
      return json({
        ok: true,
        service: "CarScan AI",
        ai: "Cloudflare Workers AI",
        model: MODEL,
        status: "ready",
      });
    }

    if (request.method !== "POST") {
      return json(
        {
          ok: false,
          error: "Method not allowed",
        },
        405
      );
    }

    if (!env || !env.AI) {
      return json(
        {
          ok: false,
          error:
            "Brak bindingu AI. W Cloudflare Worker → Settings → Bindings dodaj Workers AI z nazwą AI.",
        },
        500
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return json(
        {
          ok: false,
          error: "Nieprawidłowy JSON.",
        },
        400
      );
    }

    let image = body?.image;

    if (!image || typeof image !== "string") {
      return json(
        {
          ok: false,
          error: "Nie przesłano zdjęcia.",
        },
        400
      );
    }

    // Akceptujemy zarówno:
    // data:image/jpeg;base64,...
    // jak i samo base64.
    if (!image.startsWith("data:image/")) {
      image = `data:image/jpeg;base64,${image}`;
    }

    // Ograniczenie rozmiaru requestu
    if (image.length > 15_000_000) {
      return json(
        {
          ok: false,
          error:
            "Zdjęcie jest za duże. Spróbuj użyć mniejszego zdjęcia.",
        },
        413
      );
    }

    const systemPrompt = `
Jesteś specjalistą od rozpoznawania samochodów ze zdjęć.

Twoim zadaniem jest rozpoznać samochód widoczny na przesłanym zdjęciu.

BARDZO WAŻNE:
- Nie zgaduj, jeśli samochód nie jest wystarczająco widoczny.
- Nie wymyślaj marki ani modelu.
- Jeśli zdjęcie pokazuje tylko fragment auta, słabe ujęcie albo nie można odróżnić kilku podobnych modeli, ustaw identifiable na false.
- Confidence ma oznaczać rzeczywistą pewność rozpoznania.
- Nie podawaj fałszywie dokładnego rocznika.
- Jeśli rocznika nie da się ustalić, wpisz "Nieznany".
- Jeśli silnika nie można określić ze zdjęcia, wpisz "Nieznany".
- Jeśli napędu nie można określić, wpisz "Nieznany".
- Kolor podaj tylko wtedy, gdy rzeczywiście jest widoczny.
- Odpowiadaj WYŁĄCZNIE poprawnym JSON-em.
- Bez markdown.
- Bez komentarzy poza JSON-em.

Zwróć dokładnie taki obiekt:

{
  "identifiable": true,
  "confidence": 0,
  "brand": "",
  "model": "",
  "generation": "",
  "body": "",
  "engine": "",
  "drive": "",
  "year": "",
  "color": "",
  "notes": ""
}

confidence musi być liczbą od 0 do 100.

Jeżeli nie jesteś pewien:
{
  "identifiable": false,
  "confidence": 0,
  "brand": "",
  "model": "",
  "generation": "",
  "body": "",
  "engine": "",
  "drive": "",
  "year": "",
  "color": "",
  "notes": "Nie można wiarygodnie rozpoznać samochodu na podstawie tego zdjęcia."
}
`;

    const userPrompt = `
Przeanalizuj przesłane zdjęcie samochodu.

Spróbuj ustalić:
1. markę,
2. model,
3. generację,
4. typ nadwozia,
5. możliwy silnik,
6. napęd,
7. przybliżony rok lub zakres lat,
8. kolor.

Najważniejsze jest WIARYGODNE rozpoznanie. Jeśli nie masz wystarczającej pewności, odmów identyfikacji zamiast zgadywać.
`;

    try {
      /*
       * Cloudflare Workers AI:
       * Llama 3.2 11B Vision przyjmuje wiadomość tekstową
       * oraz obraz jako parametr "image".
       */
      const response = await env.AI.run(MODEL, {
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],

        image,

        max_tokens: 700,
        temperature: 0.1,
        top_p: 0.9,
      });

      const raw = extractModelResponse(response);

      const parsed = extractJSON(raw);

      if (!parsed) {
        return json({
          ok: true,
          identifiable: false,
          confidence: 0,
          brand: "Nie rozpoznano",
          model: "AI nie zwróciło pewnego rozpoznania",
          generation: "Nieznana",
          body: "Nieznane",
          engine: "Nieznany",
          drive: "Nieznany",
          year: "Nieznany",
          color: "Nieznany",
          notes:
            "AI nie zwróciło poprawnego rozpoznania. Spróbuj zrobić wyraźniejsze zdjęcie samochodu.",
        });
      }

      return json(normalizeResult(parsed));
    } catch (error) {
      console.error("Workers AI error:", error);

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      return json(
        {
          ok: false,
          error: "Błąd Workers AI.",
          details: message,
        },
        500
      );
    }
  },
};
