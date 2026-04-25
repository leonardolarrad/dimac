/** @odoo-module **/
// Servicio home_menu para gestionar el menú principal tipo Enterprise.
// Registra la acción "menu" que renderiza el HomeMenu como pantalla completa,
// y gestiona el toggle de clases CSS para el fondo del home menu.
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { Mutex } from "@web/core/utils/concurrency";
import { useBus, useService } from "@web/core/utils/hooks";
import { computeAppsAndMenuItems } from "@web/webclient/menus/menu_helpers";
import {
    ControllerNotFoundError,
    standardActionServiceProps,
} from "@web/webclient/actions/action_service";
import { HomeMenu } from "./home_menu";

import { Component, onMounted, onWillUnmount, reactive, xml } from "@odoo/owl";

export const homeMenuService = {
    dependencies: ["action"],
    start(env) {
        /** Inicia el servicio home_menu con estado reactivo y función toggle. */
        const state = reactive({
            hasHomeMenu: false,
            hasBackgroundAction: false,
            toggle,
        });
        const mutex = new Mutex();

        // Acción inline que renderiza el HomeMenu como acción del ActionManager
        class HomeMenuAction extends Component {
            static components = { HomeMenu };
            static target = "current";
            static props = { ...standardActionServiceProps };
            static template = xml`<HomeMenu t-props="homeMenuProps"/>`;
            static displayName = _t("Inicio");

            setup() {
                /** Configura la acción del HomeMenu y sincroniza el estado. */
                this.menus = useService("menu");
                onMounted(() => this._onMounted());
                onWillUnmount(this._onWillUnmount.bind(this));
                useBus(this.env.bus, "MENUS:APP-CHANGED", () => this.render());
            }

            get homeMenuProps() {
                /** Calcula las props del HomeMenu a partir del árbol de menús. */
                const apps = reactive(
                    computeAppsAndMenuItems(this.menus.getMenuAsTree("root")).apps
                );
                return { apps };
            }

            _onMounted() {
                /** Marca el home menu como activo al montarse. */
                const { breadcrumbs } = this.env.config;
                state.hasHomeMenu = true;
                state.hasBackgroundAction = breadcrumbs.length > 0;
                this.env.bus.trigger("HOME-MENU:TOGGLED");
            }

            _onWillUnmount() {
                /** Limpia el estado al desmontarse. */
                state.hasHomeMenu = false;
                state.hasBackgroundAction = false;
                this.env.bus.trigger("HOME-MENU:TOGGLED");
            }
        }

        registry.category("actions").add("menu", HomeMenuAction);

        // Toggle de la clase CSS del fondo del home menu en el body
        env.bus.addEventListener("HOME-MENU:TOGGLED", () => {
            document.body.classList.toggle("o_home_menu_background", state.hasHomeMenu);
        });

        async function toggle(show) {
            /** Alterna la visibilidad del HomeMenu usando un mutex para evitar race conditions. */
            return mutex.exec(async () => {
                show = show === undefined ? !state.hasHomeMenu : Boolean(show);
                if (show !== state.hasHomeMenu) {
                    if (show) {
                        await env.services.action.doAction("menu");
                    } else {
                        try {
                            await env.services.action.restore();
                        } catch (err) {
                            if (!(err instanceof ControllerNotFoundError)) {
                                throw err;
                            }
                        }
                    }
                }
                return new Promise((r) => setTimeout(r));
            });
        }

        return state;
    },
};

registry.category("services").add("home_menu", homeMenuService);
