import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

type ConsignorRow = {
  id: number;
  name: string | null;
  email: string | null;
};

type LotRow = {
  id: string;
  consignor_name: string | null;
  lot_date: string | null;
  created_at: string | null;
  status: string | null;
  notes: string | null;
  total_paid: number | null;
};

type ItemRow = {
  id: string;
  lot_id: string;
  photo_url: string | null;
  photo_urls?: string[] | null;
  notes: string | null;
  created_at: string | null;
  item_status: string | null;
  payout_status: string | null;
  sold_price: number | null;
  payout_amount: number | null;
  category: string | null;
  color: string | null;
  brand: string | null;
  size_guess: string | null;
  estimated_resale_value: number | null;
};

const formatDate = (value: string | null) => {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

const formatCurrency = (value: number | null) => {
  if (value == null) return null;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
};

const getFirstPhoto = (item: ItemRow) => item.photo_urls?.[0] ?? item.photo_url;

const getItemTitle = (item: ItemRow) =>
  [item.brand, item.category, item.color].filter(Boolean).join(" ") ||
  item.notes ||
  "Untitled item";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: consignors, error: consignorsError } = await supabase
    .from("consignors")
    .select("id, name, email")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (consignorsError) {
    throw new Error(consignorsError.message);
  }

  const { data: lots, error: lotsError } = await supabase
    .from("lots")
    .select("*")
    .order("lot_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (lotsError) {
    throw new Error(lotsError.message);
  }

  const lotRows = (lots ?? []) as LotRow[];
  const lotIds = lotRows.map((lot) => lot.id);
  const { data: items, error: itemsError } = lotIds.length
    ? await supabase
        .from("items")
        .select("*")
        .in("lot_id", lotIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const itemRows = (items ?? []) as ItemRow[];
  const itemsByLotId = itemRows.reduce<Record<string, ItemRow[]>>((acc, item) => {
    acc[item.lot_id] = [...(acc[item.lot_id] ?? []), item];
    return acc;
  }, {});
  const accountName =
    ((consignors ?? []) as ConsignorRow[]).find((consignor) => consignor.name)
      ?.name ?? null;

  async function signOut() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Ruby Baby Dashboard
            </h1>
            <div className="space-y-1 text-sm text-zinc-600">
              <p>
                Signed in as{" "}
                <span className="font-medium text-zinc-950">{user.email}</span>
              </p>
              {accountName ? (
                <p>
                  Account{" "}
                  <span className="font-medium text-zinc-950">
                    {accountName}
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
            >
              Sign out
            </button>
          </form>
        </header>

        {lotRows.length === 0 ? (
          <section className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold">No linked lots yet</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Once Ruby Baby links your consignor account to a lot, it will
              appear here.
            </p>
          </section>
        ) : (
          <section className="flex flex-col gap-4">
            {lotRows.map((lot) => {
              const lotItems = itemsByLotId[lot.id] ?? [];

              return (
                <article
                  key={lot.id}
                  className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {lot.consignor_name ?? accountName ?? "Consignor lot"}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-600">
                        {formatDate(lot.lot_date ?? lot.created_at)}
                      </p>
                      {lot.notes ? (
                        <p className="mt-2 text-sm text-zinc-600">
                          {lot.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                      {lot.status ? (
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">
                          {lot.status}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">
                        {lotItems.length} {lotItems.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                  </div>

                  {lotItems.length === 0 ? (
                    <p className="pt-4 text-sm text-zinc-500">
                      No items have been added to this lot yet.
                    </p>
                  ) : (
                    <div className="grid gap-3 pt-4 sm:grid-cols-2">
                      {lotItems.map((item) => {
                        const firstPhoto = getFirstPhoto(item);
                        const soldPrice = formatCurrency(item.sold_price);
                        const estimatedValue = formatCurrency(
                          item.estimated_resale_value,
                        );
                        const payoutAmount = formatCurrency(item.payout_amount);

                        return (
                          <div
                            key={item.id}
                            className="flex gap-3 rounded-md border border-zinc-100 p-3"
                          >
                            {firstPhoto ? (
                              <img
                                src={firstPhoto}
                                alt=""
                                className="h-20 w-20 flex-none rounded-md bg-zinc-100 object-cover"
                              />
                            ) : (
                              <div className="h-20 w-20 flex-none rounded-md bg-zinc-100" />
                            )}

                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-sm font-semibold">
                                {getItemTitle(item)}
                              </h3>
                              <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-zinc-600">
                                {item.item_status ? (
                                  <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                                    {item.item_status}
                                  </span>
                                ) : null}
                                {item.payout_status ? (
                                  <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                                    {item.payout_status}
                                  </span>
                                ) : null}
                                {item.size_guess ? (
                                  <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                                    {item.size_guess}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-2 space-y-0.5 text-xs text-zinc-600">
                                {soldPrice ? <p>Sold: {soldPrice}</p> : null}
                                {estimatedValue ? (
                                  <p>Estimated: {estimatedValue}</p>
                                ) : null}
                                {payoutAmount ? <p>Payout: {payoutAmount}</p> : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
