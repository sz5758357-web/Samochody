export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({
                error: "Dozwolona jest tylko metoda POST."
            });
        }

        const { image } = req.body || {};

        if (!image || typeof image !== "string") {
            return res.status(400).json({
                error: "Serwer nie otrzymał zdjęcia."
            });
        }

        // Sprawdzamy prawidłowy data URL obrazu
        const imageMatch = image.match(
            /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/
        );

        if (!imageMatch) {
            return res.status(400).json({
                error: "Nieprawidłowy format zdjęcia.",
                received: image.substring(0, 40)
            });
        }

        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "Brakuje zmiennej OPENAI_API_KEY w Vercel."
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
Jesteś profesjonalnym systemem CarScan AI.

Twoim zadaniem jest rozpoznawanie samochodów ze zdjęć.

NAJWAŻNIEJSZE:
Najpierw ustal, czy na zdjęciu naprawdę znajduje się samochód.

Jeżeli nie ma samochodu, NIE ZGADUJ.

Dla zdjęcia podłogi, ściany, pokoju, człowieka,
zwierzęcia, roweru, motocykla, przedmiotu itd. zwróć:

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

Jeżeli samochód jest widoczny, rozpoznaj:

- markę
- model
- generację
- przybliżony zakres roczników
- pełną nazwę

Nie zgaduj na siłę.

Jeżeli nie można wiarygodnie określić modelu,
zwróć null.

confidence musi być liczbą od 0 do 1.

Zwróć WYŁĄCZNIE JSON:

{
  "is_car": true,
  "brand": "BMW",
  "model": "M3",
  "generation": "G80",
  "year": "2021–2024",
  "name": "BMW M3 G80",
  "confidence": 0.94,
  "reason": "krótkie uzasadnienie"
}
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

        const responseText = await response.text();

        // Jeżeli OpenAI zwróciło błąd,
        // pokazujemy jego prawdziwą treść.
        if (!response.ok) {
            console.error(
                "OPENAI ERROR:",
                response.status,
                responseText
            );

            let errorMessage = "OpenAI zwróciło błąd.";

            try {
                const errorJson = JSON.parse(responseText);

                errorMessage =
                    errorJson?.error?.message ||
                    errorJson?.error?.code ||
                    errorMessage;

            } catch {}

            return res.status(500).json({
                error: errorMessage,
                openai_status: response.status
            });
        }

        let result;

        try {
            result = JSON.parse(responseText);
        } catch {
            return res.status(500).json({
                error: "OpenAI zwróciło nieprawidłową odpowiedź."
            });
        }

        const outputText =
            result.output_text || "";

        if (!outputText) {
            return res.status(500).json({
                error: "AI nie zwróciło tekstowego wyniku."
            });
        }

        let carData;

        try {
            carData = JSON.parse(outputText);
        } catch {
            const match =
                outputText.match(/\{[\s\S]*\}/);

            if (!match) {
                return res.status(500).json({
                    error: "Nie udało się odczytać wyniku AI.",
                    raw: outputText.substring(0, 500)
                });
            }

            try {
                carData = JSON.parse(match[0]);
            } catch {
                return res.status(500).json({
                    error: "AI zwróciło niepoprawny JSON."
                });
            }
        }

        if (typeof carData.is_car !== "boolean") {
            return res.status(500).json({
                error: "AI nie zwróciło pola is_car."
            });
        }

        return res.status(200).json(carData);

    } catch (error) {

        console.error("SERVER ERROR:", error);

        return res.status(500).json({
            error: error?.message || "Nieznany błąd serwera."
        });
    }
}
