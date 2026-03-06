import { cookie } from "@web/core/browser/cookie";
import { registry } from "@web/core/registry";
import { session } from "@web/session";
import { user } from "@web/core/user";
import { router } from "@web/core/browser/router";

const CURR_IDS_SEPARATOR = "-";

function parseCurrencyIds(currIds, separator = CURR_IDS_SEPARATOR) {
    if (typeof currIds === "string") {
        return currIds.split(separator).map(Number);
    } else if (typeof currIds === "number") {
        return [currIds];
    }
    return [];
}

function computeActiveCurrencyIds(currIds) {
    const { user_currencies } = session;
    if (!user_currencies || !user_currencies.available_currencies) {
        return currIds || [];
    }
    let activeCurrencyIds = currIds || [];
    const availableCurrencies = user_currencies.available_currencies;
    const notAllowed = activeCurrencyIds.filter(
        (id) => !(id in availableCurrencies)
    );

    if (!activeCurrencyIds.length || notAllowed.length) {
        activeCurrencyIds = [user_currencies.current_currency];
    }
    return activeCurrencyIds;
}

function getCurrencyIds() {
    let currIds;
    const state = router.current;
    if ("curr_ids" in state) {
        if (typeof state.curr_ids === "string" && !state.curr_ids.includes(CURR_IDS_SEPARATOR)) {
            currIds = parseCurrencyIds(state.curr_ids, ",");
        } else {
            currIds = parseCurrencyIds(state.curr_ids);
        }
    } else if (cookie.get("curr_ids")) {
        currIds = parseCurrencyIds(cookie.get("curr_ids"));
    }
    return currIds || [];
}

export const currencyService = {
    dependencies: ["action"],
    start(env, { action }) {
        if (!session.user_currencies || !session.user_currencies.available_currencies) {
            return {
                availableCurrencies: {},
                activeCurrencyIds: [],
                currentCurrency: null,
                currentCurrencies: {},
                formattedCodes: "",
                getCurrency: () => null,
                setCurrencies: async () => { },
            };
        }
        const availableCurrencies = session.user_currencies.available_currencies;
        const activeCurrencyIds = computeActiveCurrencyIds(getCurrencyIds());

        // Update browser data
        cookie.set("curr_ids", activeCurrencyIds.join(CURR_IDS_SEPARATOR));
        user.updateContext({ allowed_currency_ids: activeCurrencyIds });

        return {
            availableCurrencies,

            get activeCurrencyIds() {
                return activeCurrencyIds.slice();
            },

            get currentCurrency() {
                return availableCurrencies[activeCurrencyIds[0]];
            },

            get currentCurrencies() {
                return availableCurrencies;
            },

            get formattedCodes() {
                return activeCurrencyIds.map(c => availableCurrencies[c].code).join(' / ')
            },

            getCurrency(currencyId) {
                return availableCurrencies[currencyId];
            },

            async setCurrencies(currencyIds) {
                const newCurrencyIds = currencyIds.length
                    ? currencyIds
                    : [activeCurrencyIds[0]];

                cookie.set("curr_ids", newCurrencyIds.join(CURR_IDS_SEPARATOR));
                await user.updateContext({ allowed_currency_ids: newCurrencyIds });

                router.pushState({}, { reload: true });
            },
        };
    },
};

registry.category("services").add("multi_currency", currencyService);
