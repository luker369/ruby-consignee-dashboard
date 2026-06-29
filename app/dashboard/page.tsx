import Image from "next/image";
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
  date_received?: string | null;
  received_at?: string | null;
  lot_date: string | null;
  created_at: string | null;
  status: string | null;
  notes: string | null;
  total_paid: number | null;
  shipping_expense?: number | string | null;
  shipping_cost?: number | string | null;
  shipping_amount?: number | string | null;
  shipping_deduction_applied?: boolean | null;
};

type ItemRow = {
  id: string;
  lot_id: string;
  title?: string | null;
  name?: string | null;
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

type StatBox = {
  label: string;
  value: string | number;
};

type FinancialRow = {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "default" | "positive";
};

const formatDate = (value: string | null) => {
  if (!value) return "No date";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatCurrency = (value: number | null) => {
  if (value == null) return null;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
};

const toMoneyNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getFirstPhoto = (item: ItemRow) => item.photo_urls?.[0] ?? item.photo_url;

const getItemTitle = (item: ItemRow) =>
  item.title ||
  item.name ||
  [item.brand, item.category, item.color].filter(Boolean).join(" ") ||
  item.notes ||
  "Untitled item";

const getItemStatusLabels = (item: ItemRow) => {
  if (item.item_status === "sold" && item.payout_status === "unpaid") {
    return ["Sold — Included in Next Payout"];
  }

  if (item.item_status === "sold" && item.payout_status === "paid") {
    return ["Sold", "Paid to You"];
  }

  if (item.item_status === "sold") {
    return ["Sold"];
  }

  return [item.item_status ?? "Available"];
};

const getLotDate = (lot: LotRow) =>
  lot.date_received ?? lot.received_at ?? lot.lot_date ?? lot.created_at;

const getShippingExpense = (lot: LotRow) =>
  toMoneyNumber(
    lot.shipping_expense ?? lot.shipping_cost ?? lot.shipping_amount ?? null,
  );

const getLotSummary = (lot: LotRow, items: ItemRow[]) => {
  const soldItems = items.filter((item) => item.item_status === "sold");
  const unsoldItems = items.filter((item) => item.item_status !== "sold");
  const soldUnpaid = soldItems.filter(
    (item) => item.payout_status === "unpaid",
  );
  const soldPaid = soldItems.filter((item) => item.payout_status === "paid");
  const totalSales = soldItems.reduce(
    (sum, item) => sum + toMoneyNumber(item.sold_price),
    0,
  );
  const totalOwed = soldItems.reduce(
    (sum, item) => sum + toMoneyNumber(item.payout_amount),
    0,
  );
  const alreadyPaid = soldPaid.reduce(
    (sum, item) => sum + toMoneyNumber(item.payout_amount),
    0,
  );
  const shippingExpense = getShippingExpense(lot);
  const shippingHalf = shippingExpense / 2;
  const yourPayout = totalOwed - shippingHalf;
  const rubyBabyShare = totalSales - yourPayout - shippingExpense;
  const adjustedAlreadyPaid =
    alreadyPaid - (lot.shipping_deduction_applied ? shippingHalf : 0);
  const stillOwed = yourPayout - adjustedAlreadyPaid;

  return {
    stats: [
      { label: "Total Items", value: items.length },
      { label: "Unsold", value: unsoldItems.length },
      { label: "Sold — Included in Next Payout", value: soldUnpaid.length },
      { label: "Paid to You", value: soldPaid.length },
    ] satisfies StatBox[],
    financialRows: [
      { label: "Total Sales", value: formatCurrency(totalSales) ?? "$0.00" },
      {
        label: "Shipping Expense",
        value: formatCurrency(shippingExpense) ?? "$0.00",
      },
      {
        label: "Your Shipping Half",
        value: `-${formatCurrency(shippingHalf) ?? "$0.00"}`,
      },
      {
        label: "Ruby Baby Shipping Half",
        value: `-${formatCurrency(shippingHalf) ?? "$0.00"}`,
      },
      { label: "Your Payout", value: formatCurrency(yourPayout) ?? "$0.00" },
      {
        label: "Ruby Baby Share",
        value: formatCurrency(rubyBabyShare) ?? "$0.00",
      },
      {
        label: "Already Paid to You",
        value: formatCurrency(adjustedAlreadyPaid) ?? "$0.00",
        tone: "positive",
      },
      {
        label: "Remaining Balance",
        value: formatCurrency(stillOwed) ?? "$0.00",
        highlight: true,
      },
    ] satisfies FinancialRow[],
  };
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect("/login");
  }

  let loadError: string | null = null;

  const { data: consignors, error: consignorsError } = await supabase
    .from("consignors")
    .select("id, name, email")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (consignorsError) loadError = `Could not load account: ${consignorsError.message}`;

  const { data: lots, error: lotsError } = await supabase
    .from("lots")
    .select("*")
    .order("lot_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (lotsError) loadError = `Could not load lots: ${lotsError.message}`;

  const lotRows = lotsError ? [] : ((lots ?? []) as LotRow[]);
  const lotIds = lotRows.map((lot) => lot.id);
  const { data: items, error: itemsError } = lotIds.length
    ? await supabase
        .from("items")
        .select("*")
        .in("lot_id", lotIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (itemsError) loadError = `Could not load items: ${itemsError.message}`;

  const itemRows = itemsError ? [] : ((items ?? []) as ItemRow[]);
  const itemsByLotId = itemRows.reduce<Record<string, ItemRow[]>>((acc, item) => {
    acc[item.lot_id] = [...(acc[item.lot_id] ?? []), item];
    return acc;
  }, {});
  const accountName =
    (consignorsError ? [] : ((consignors ?? []) as ConsignorRow[])).find((consignor) => consignor.name)
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
        <header className="flex flex-col gap-5 border-b border-zinc-200 pb-7 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4 sm:gap-5">
            <Image
              src="/assets/ruby-baby-vintage-logo.jpeg"
              alt="Ruby Baby Vintage"
              width={128}
              height={128}
              className="h-24 w-24 rounded-full object-contain sm:h-32 sm:w-32"
              preload
            />
            <div className="flex min-h-24 flex-col justify-end space-y-2 pt-2 sm:min-h-32">
              <h1 className="text-3xl font-semibold tracking-tight">
                Ruby Baby Dashboard
              </h1>
              <div className="space-y-1 text-sm text-zinc-600">
                <p>
                  Signed in as{" "}
                  <span className="font-medium text-zinc-950">
                    {user.email}
                  </span>
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

        {loadError ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-red-900">
              This page could not load all dashboard data.
            </h2>
            <p className="mt-2 text-sm text-red-800">{loadError}</p>
          </section>
        ) : lotRows.length === 0 ? (
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
              const summary = getLotSummary(lot, lotItems);

              return (
                <article
                  key={lot.id}
                  className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {lot.consignor_name ?? accountName ?? "Consignor lot"}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-600">
                        {formatDate(getLotDate(lot))}
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

                  <div className="grid grid-cols-2 gap-2 pt-4 sm:grid-cols-4">
                    {summary.stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-md border border-zinc-100 bg-zinc-50 p-3"
                      >
                        <p className="text-2xl font-semibold tabular-nums text-zinc-950">
                          {stat.value}
                        </p>
                        <p className="mt-1 text-xs font-medium uppercase text-zinc-500">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-md border border-zinc-100">
                    <div className="border-b border-zinc-100 px-3 py-2">
                      <h3 className="text-sm font-semibold text-zinc-950">
                        Financial Summary
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Remaining balance reflects sold items that have not yet
                        been included in a payout.
                      </p>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {summary.financialRows.map((row) => (
                        <div
                          key={row.label}
                          className={`flex items-center justify-between gap-4 px-3 py-2.5 text-sm ${
                            row.highlight ? "bg-rose-50" : ""
                          }`}
                        >
                          <span
                            className={
                              row.highlight
                                ? "font-semibold text-zinc-950"
                                : "text-zinc-600"
                            }
                          >
                            {row.label}
                          </span>
                          <span
                            className={`text-right font-semibold tabular-nums ${
                              row.tone === "positive"
                                ? "text-emerald-700"
                                : "text-zinc-950"
                            }`}
                          >
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {lotItems.length === 0 ? (
                    <p className="pt-4 text-sm text-zinc-500">
                      No items have been added to this lot yet.
                    </p>
                  ) : (
                    <div className="pt-5">
                      <h3 className="text-sm font-semibold text-zinc-950">
                        Items
                      </h3>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {lotItems.map((item) => {
                          const firstPhoto = getFirstPhoto(item);
                          const soldPrice = formatCurrency(item.sold_price);
                          const estimatedValue = formatCurrency(
                            item.estimated_resale_value,
                          );
                          const payoutAmount = formatCurrency(
                            item.payout_amount,
                          );
                          const statusLabels = getItemStatusLabels(item);

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
                                <h4 className="truncate text-sm font-semibold">
                                  {getItemTitle(item)}
                                </h4>
                                <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-zinc-600">
                                  {statusLabels.map((label) => (
                                    <span
                                      key={label}
                                      className="rounded-full bg-zinc-100 px-2 py-0.5"
                                    >
                                      {label}
                                    </span>
                                  ))}
                                  {item.size_guess ? (
                                    <span className="rounded-full bg-zinc-100 px-2 py-0.5">
                                      {item.size_guess}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-2 space-y-0.5 text-xs text-zinc-600">
                                  {soldPrice ? (
                                    <p>Sold for: {soldPrice}</p>
                                  ) : null}
                                  {estimatedValue ? (
                                    <p>Estimated: {estimatedValue}</p>
                                  ) : null}
                                  {payoutAmount ? (
                                    <p>Your payout: {payoutAmount}</p>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
