export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {
        const { image } = req.body || {};

        if (!image || typeof image !== "string") {
            return res.status(400).json({
                error: "Brak zdjęcia"
            });
        }

        if (!image.startsWith("data:image/")) {
            return res.status(400).json({
                error: "Nieprawidłowy format zdjęcia"
            });
        }

        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "Brak OPENAI_API_KEY na serwerze"
            });
        }

        const response = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },

                body: JSON.stringify({
                    model: "gpt-5.6-luna",

                    input: [
                        {
                            role: "user",

                            content: [
                                {
                                    type: "input_text",

                                    text: `
Jesteś systemem CarScan do rozpoznawania samochodów.

Najpierw dokładnie sprawdź zdjęcie.

WAŻNE:
Jeżeli na zdjęciu NIE MA samochodu, nigdy nie zgaduj samochodu.

W takim przypadku zwróć:

{
  "is_car": false,
  "brand": null,
  "model": null,
  "generation": null,
  "year": null,
  "name": null,
  "confidence": 0,
  "reason": "krótkie wyjaśnienie"
}

Jeżeli na zdjęciu JEST samochód, rozpoznaj możliwie dokładnie:

- producenta
- model
- generację
- wersję, jeżeli jest możliwa do rozpoznania
- przybliżony rok lub zakres lat
- pełną nazwę samochodu

Przykład:

{
  "is_car": true,
  "brand": "BMW",
  "model": "M3",
  "generation": "G80",
  "year": "2021–2024",
  "name": "BMW M3 G80",
  "confidence": 0.94,
  "reason": "Charakterystyczne reflektory, grill i proporcje nadwozia."
}

Nie zgaduj na siłę.

Jeżeli nie da się określić dokładnego modelu albo generacji,
wpisz null i odpowiednio zmniejsz confidence.

Podłoga, ściana, budynek, człowiek, zwierzę, rower,
motocykl, zabawka, przypadkowy przedmiot itd. NIE są samochodem.

confidence musi być liczbą od 0 do 1.

Zwróć WYŁĄCZNIE poprawny JSON.
Bez markdownu.
Bez dodatkowego tekstu.
`
                                },

                                {
                                    type: "input_image",
                                    image_url: image,
                                    detail: "high"
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const raw = await response.text();

        if (!response.ok) {
            console.error("OpenAI ERROR:", raw);

            return res.status(response.status).json({
                error: "Błąd OpenAI API"
            });
        }

        const result = JSON.parse(raw);

        const output = result.output_text || "";

        let data;

        try {
            data = JSON.parse(output);
        } catch {
            const match = output.match(/\{[\s\S]*\}/);

            if (!match) {
                return res.status(500).json({
                    error: "AI zwróciło nieprawidłową odpowiedź"
                });
            }

            data = JSON.parse(match[0]);
        }

        if (typeof data.is_car !== "boolean") {
            return res.status(500).json({
                error: "Nieprawidłowy wynik AI"
            });
        }

        return res.status(200).json(data);

    } catch (error) {

        console.error("SERVER ERROR:", error);

        return res.status(500).json({
            error: "Wewnętrzny błąd serwera"
        });
    }
}
