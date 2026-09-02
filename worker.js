export default {
  async fetch(request, env) {

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };


    if (request.method === "OPTIONS") {

      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });

    }


    if (request.method !== "POST") {

      return json(
        {
          error: "Użyj metody POST."
        },
        405,
        corsHeaders
      );

    }


    try {

      const body =
        await request.json();


      if (!body.image) {

        return json(
          {
            error: "Brak zdjęcia."
          },
          400,
          corsHeaders
        );

      }


      if (
        typeof body.image !== "string" ||
        !body.image.startsWith("data:image/")
      ) {

        return json(
          {
            error: "Nieprawidłowy format zdjęcia."
          },
          400,
          corsHeaders
        );

      }


      const response =
        await fetch(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              "Authorization":
                `Bearer ${env.OPENAI_API_KEY}`
            },

            body: JSON.stringify({

              model: "gpt-5",

              temperature: 0,

              input: [
                {
                  role: "system",

                  content: [
                    {
                      type: "input_text",

                      text: `
Jesteś specjalistą od identyfikacji samochodów.

Twoim zadaniem jest rozpoznać samochód ze zdjęcia.

BARDZO WAŻNE:

1. Nie zgaduj, jeśli zdjęcie nie daje wystarczających informacji.
2. Nie wymyślaj generacji, silnika ani rocznika.
3. Jeśli nie da się określić konkretnej wartości, wpisz "Nieznane".
4. Najpierw określ, czy na zdjęciu rzeczywiście znajduje się samochód.
5. Zwróć uwagę na:
   - reflektory
   - grill
   - kształt nadwozia
   - tylne światła
   - zderzaki
   - proporcje
   - felgi
   - charakterystyczne elementy modelu
   - emblematy
   - oznaczenia
6. Oddziel pewność rozpoznania marki od pewności modelu w swoim wewnętrznym rozumowaniu.
7. Pole confidence ma oznaczać ogólną pewność całego rozpoznania.
8. Jeżeli model i generacja są bardzo podobne do innych aut, obniż confidence.
9. Jeśli zdjęcie pokazuje tylko fragment samochodu albo jest bardzo słabe, ustaw identifiable=false.
10. Nie podawaj losowego modelu tylko po to, aby odpowiedź wyglądała kompletnie.

Odpowiedź musi być wyłącznie zgodna ze zdefiniowanym JSON schema.
`
                    }
                  ]
                },

                {
                  role: "user",

                  content: [
                    {
                      type: "input_text",

                      text: `
Rozpoznaj samochód ze zdjęcia.

Potrzebuję:
marka,
model,
generacja,
nadwozie,
silnik,
napęd,
przybliżony rocznik,
kolor,
confidence 0-100,
identifiable,
krótkie notes.

Jeśli czegoś nie można wiarygodnie określić, wpisz "Nieznane".
`
                    },

                    {
                      type: "input_image",

                      image_url: body.image,

                      detail: "high"
                    }
                  ]
                }
              ],


              text: {

                format: {

                  type: "json_schema",

                  name: "car_identification",

                  strict: true,

                  schema: {

                    type: "object",

                    additionalProperties: false,

                    properties: {

                      brand: {
                        type: "string"
                      },

                      model: {
                        type: "string"
                      },

                      generation: {
                        type: "string"
                      },

                      body: {
                        type: "string"
                      },

                      engine: {
                        type: "string"
                      },

                      drive: {
                        type: "string"
                      },

                      year: {
                        type: "string"
                      },

                      color: {
                        type: "string"
                      },

                      confidence: {
                        type: "number"
                      },

                      identifiable: {
                        type: "boolean"
                      },

                      notes: {
                        type: "string"
                      }

                    },

                    required: [
                      "brand",
                      "model",
                      "generation",
                      "body",
                      "engine",
                      "drive",
                      "year",
                      "color",
                      "confidence",
                      "identifiable",
                      "notes"
                    ]

                  }

                }

              }

            })

          }
        );


      if (!response.ok) {

        const errorText =
          await response.text();

        console.error(
          "OpenAI error:",
          errorText
        );


        return json(
          {
            error:
              "AI zwróciło błąd. Spróbuj ponownie."
          },
          502,
          corsHeaders
        );

      }


      const data =
        await response.json();


      const text =
        data.output_text;


      if (!text) {

        return json(
          {
            error:
              "AI nie zwróciło wyniku."
          },
          502,
          corsHeaders
        );

      }


      let result;


      try {

        result =
          JSON.parse(text);

      } catch {

        return json(
          {
            error:
              "Nie udało się odczytać wyniku AI."
          },
          502,
          corsHeaders
        );

      }


      result.confidence =
        Math.max(
          0,
          Math.min(
            100,
            Number(result.confidence) || 0
          )
        );


      /*
        Dodatkowe zabezpieczenie:
        jeżeli AI samo mówi, że nie jest
        identyfikowalne, nie pozwalamy
        frontendowi udawać pewnego wyniku.
      */

      if (!result.identifiable) {

        result.confidence =
          Math.min(
            result.confidence,
            35
          );

      }


      return json(
        result,
        200,
        corsHeaders
      );


    } catch (error) {

      console.error(error);


      return json(
        {
          error:
            "Wystąpił błąd serwera."
        },
        500,
        corsHeaders
      );

    }

  }
};


function json(
  data,
  status,
  corsHeaders
) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        ...corsHeaders
      }
    }
  );

}
