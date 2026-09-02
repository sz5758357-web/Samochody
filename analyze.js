export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const body = req.body || {};

        const image = body.image;

        if (!image) {
            return res.status(400).json({
                error: "Nie otrzymano zdjęcia."
            });
        }

        if (
            typeof image !== "string" ||
            !image.startsWith("data:image/")
        ) {
            return res.status(400).json({
                error: "Nieprawidłowy format zdjęcia."
            });
        }

        const apiKey =
            process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error:
                    "Brak OPENAI_API_KEY w Vercel."
            });
        }


        /* =========================
           OPENAI
        ========================= */

        const openaiResponse =
            await fetch(
                "https://api.openai.com/v1/responses",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${apiKey}`
                    },

                    body: JSON.stringify({

                        model:
                            "gpt-5.6-luna",

                        input: [

                            {
                                role: "user",

                                content: [

                                    {
                                        type:
                                            "input_text",

                                        text: `
Jesteś CarScan AI.

Masz rozpoznawać samochody
na przesłanych zdjęciach.

NAJWAŻNIEJSZA ZASADA:

Najpierw sprawdź, czy zdjęcie
naprawdę przedstawia samochód.

Jeżeli NIE przedstawia samochodu,
NIE WOLNO zgadywać marki ani modelu.

Dla podłogi, ściany, pokoju,
człowieka, zwierzęcia, roweru,
motocykla, przypadkowego przedmiotu
itp. zwróć:

{
  "is_car": false,
  "brand": null,
  "model": null,
  "generation": null,
  "year": null,
  "name": null,
  "confidence": 0,
  "reason": "Na zdjęciu nie ma samochodu."
}

Jeżeli jest samochód:

Rozpoznaj możliwie dokładnie:

1. markę
2. model
3. generację
4. przybliżony rok lub zakres lat
5. pełną nazwę

Nie zgaduj na siłę.

Jeżeli nie można wiarygodnie określić
konkretnego modelu albo generacji,
użyj null.

confidence ma być liczbą od 0 do 1.

Zwróć WYŁĄCZNIE poprawny JSON.

Przykład samochodu:

{
  "is_car": true,
  "brand": "BMW",
  "model": "M3",
  "generation": "G80",
  "year": "2021–2024",
  "name": "BMW M3 G80",
  "confidence": 0.94,
  "reason": "Charakterystyczne elementy nadwozia."
}
`
                                    },

                                    {
                                        type:
                                            "input_image",

                                        image_url:
                                            image
                                    }

                                ]
                            }

                        ],

                        text: {

                            format: {

                                type:
                                    "json_schema",

                                name:
                                    "carscan_result",

                                strict:
                                    true,

                                schema: {

                                    type:
                                        "object",

                                    properties: {

                                        is_car: {
                                            type:
                                                "boolean"
                                        },

                                        brand: {
                                            type:
                                                [
                                                    "string",
                                                    "null"
                                                ]
                                        },

                                        model: {
                                            type:
                                                [
                                                    "string",
                                                    "null"
                                                ]
                                        },

                                        generation: {
                                            type:
                                                [
                                                    "string",
                                                    "null"
                                                ]
                                        },

                                        year: {
                                            type:
                                                [
                                                    "string",
                                                    "null"
                                                ]
                                        },

                                        name: {
                                            type:
                                                [
                                                    "string",
                                                    "null"
                                                ]
                                        },

                                        confidence: {
                                            type:
                                                "number"
                                        },

                                        reason: {
                                            type:
                                                "string"
                                        }

                                    },

                                    required: [
                                        "is_car",
                                        "brand",
                                        "model",
                                        "generation",
                                        "year",
                                        "name",
                                        "confidence",
                                        "reason"
                                    ],

                                    additionalProperties:
                                        false
                                }
                            }
                        }
                    })
                }
            );


        /* =========================
           BŁĄD OPENAI
        ========================= */

        const raw =
            await openaiResponse.text();

        if (!openaiResponse.ok) {

            console.error(
                "OPENAI ERROR:",
                raw
            );

            let message =
                "Błąd OpenAI API.";

            try {

                const error =
                    JSON.parse(raw);

                message =
                    error?.error?.message ||
                    message;

            } catch {}

            return res.status(500).json({
                error: message
            });
        }


        /* =========================
           ODPOWIEDŹ
        ========================= */

        let result;

        try {

            result =
                JSON.parse(raw);

        } catch {

            return res.status(500).json({
                error:
                    "OpenAI zwróciło nieprawidłową odpowiedź."
            });
        }


        const outputText =
            result.output_text;

        if (!outputText) {

            return res.status(500).json({
                error:
                    "AI nie zwróciło wyniku."
            });
        }


        let data;

        try {

            data =
                JSON.parse(outputText);

        } catch {

            return res.status(500).json({
                error:
                    "Nie można odczytać wyniku AI."
            });
        }


        return res.status(200).json(data);


    } catch (error) {

        console.error(
            "SERVER ERROR:",
            error
        );

        return res.status(500).json({
            error:
                error?.message ||
                "Nieznany błąd serwera."
        });
    }
}
