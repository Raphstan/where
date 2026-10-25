import { describe, expect, it } from "vitest";
import { buildMemory, filterMemory, memoryCategory, memoryStats, type MemorySignalRow } from "./memory";

const sarah = { id: "m-sarah", name: "Sarah" };
const maya = { id: "m-maya", name: "Maya" };

function row(
  place: string,
  level: MemorySignalRow["level"],
  member: MemorySignalRow["member"] = null,
  extra: Partial<MemorySignalRow> & { kind?: string | null; city?: string | null; daysAgo?: number } = {},
): MemorySignalRow {
  const { kind = null, city = "Tel Aviv", daysAgo = 1, ...rest } = extra;
  return {
    place: { id: place, name: place, city, kind },
    level,
    member,
    createdAt: new Date(Date.UTC(2026, 9, 25) - daysAgo * 86_400_000),
    imported: null,
    ...rest,
  };
}

describe("buildMemory", () => {
  it("garde une carte par lieu, avec sa preuve la plus forte et le libellé court de la maquette", () => {
    const items = buildMemory([
      row("Beit Kandinof", "visited", null),
      row("Beit Kandinof", "recommended", sarah),
      row("Herzl 16", "saved", maya),
      row("The Norman", "booked", null),
    ]);
    expect(items.map((i) => [i.name, i.label])).toEqual(
      expect.arrayContaining([
        ["Beit Kandinof", "Recommandé par Sarah"],
        ["Herzl 16", "Sauvegardé par Maya"],
        ["The Norman", "Réservé"],
      ]),
    );
    expect(items).toHaveLength(3);
  });

  it("n'affiche jamais « par » quand le signal vient de l'utilisateur", () => {
    const [item] = buildMemory([row("Fantastic", "visited")]);
    expect(item.label).toBe("Visité");
  });

  it("n'admet jamais le niveau public dans la mémoire personnelle", () => {
    expect(buildMemory([row("Plage de Sdot Yam", "public")])).toEqual([]);
  });

  it("une réservation importée reste « Réservé » tant que la visite n'est pas confirmée", () => {
    const [item] = buildMemory([row("MILA", "booked", null, { imported: "table" })]);
    expect(item.label).toBe("Réservé");
    expect(item.category).toBe("restaurants");
  });

  it("trie par preuve la plus récente", () => {
    const items = buildMemory([row("Ancien", "visited", null, { daysAgo: 300 }), row("Récent", "saved", null, { daysAgo: 2 })]);
    expect(items.map((i) => i.name)).toEqual(["Récent", "Ancien"]);
  });
});

describe("memoryCategory", () => {
  it("classe les types en clair de la maquette", () => {
    expect(memoryCategory("Bar-restaurant")).toBe("bars");
    expect(memoryCategory("Restaurant & galerie")).toBe("restaurants");
    expect(memoryCategory("Hôtel boutique")).toBe("hotels");
    expect(memoryCategory("Boulangerie-café")).toBe("cafes");
    expect(memoryCategory("Plage")).toBe("activites");
    expect(memoryCategory("Voyage")).toBe("voyages");
  });

  it("se rabat sur l'email importé, sinon ne range le lieu que sous « Tout »", () => {
    expect(memoryCategory(null, "hotel")).toBe("hotels");
    expect(memoryCategory(null, "activity")).toBe("activites");
    expect(memoryCategory(null)).toBeNull();
  });

  it("filtre par catégorie, « Tout » garde tout", () => {
    const items = buildMemory([row("Herzl 16", "saved", maya, { kind: "Bar-restaurant" }), row("Café Nahat", "recommended", maya, { kind: "Café" })]);
    expect(filterMemory(items, "bars").map((i) => i.name)).toEqual(["Herzl 16"]);
    expect(filterMemory(items, "tous")).toHaveLength(2);
    expect(filterMemory(items, "hotels")).toEqual([]);
  });
});

describe("memoryStats", () => {
  it("compte les lieux visités par l'utilisateur, les recos reçues du cercle et les villes", () => {
    const stats = memoryStats([
      row("Fantastic", "visited"),
      row("Fantastic", "booked"),
      row("HaMigdal", "recommended", null, { city: "Jerusalem" }),
      row("The Norman", "booked"),
      row("Beit Kandinof", "recommended", sarah),
      row("Beit Kandinof", "recommended", sarah, { daysAgo: 40 }),
      row("Beit Kandinof", "visited", maya),
      row("Hotel de’ Ricci", "recommended", sarah, { city: "Rome" }),
      row("Ailleurs", "public", null, { city: "Haïfa" }),
    ]);
    expect(stats).toEqual({ visited: 2, recosReceived: 2, cities: 3 });
  });

  it("une visite d'un proche n'est pas une visite de l'utilisateur", () => {
    expect(memoryStats([row("Beit Kandinof", "visited", maya)]).visited).toBe(0);
  });
});
