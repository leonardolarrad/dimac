/** @odoo-module **/
// D21NavBar: Navbar estilo Enterprise para Community.
// Extiende la NavBar de Community para integrar el servicio home_menu,
// alternando entre el icono de grid y la flecha de retorno según el estado.
// :method: NavBar.setup addons/web/static/src/webclient/navbar/navbar.js
import { NavBar } from "@web/webclient/navbar/navbar";
import { useService, useBus } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";
import { useEffect, useRef } from "@odoo/owl";

export class D21NavBar extends NavBar {
    static template = "d21_menu.D21NavBar";

    setup() {
        /** Configura la navbar D21 con el servicio home_menu y refs adicionales. */
        super.setup();
        this.hm = useService("home_menu");
        this.pwa = useService("pwa");
        this.menuAppsRef = useRef("menuApps");
        this.navRef = useRef("nav");
        this._busToggledCallback = () => this._updateMenuAppsIcon();
        useBus(this.env.bus, "HOME-MENU:TOGGLED", this._busToggledCallback);
        useEffect(() => this._updateMenuAppsIcon());
    }

    get hasBackgroundAction() {
        /** Indica si hay una acción detrás del HomeMenu. */
        return this.hm.hasBackgroundAction;
    }

    get isInApp() {
        /** Indica si estamos dentro de una app (no en el HomeMenu). */
        return !this.hm.hasHomeMenu;
    }

    _openAppMenuSidebar() {
        /** En móvil: cierra el HomeMenu si está abierto, o abre el sidebar. */
        if (this.hm.hasHomeMenu) {
            this.hm.toggle(false);
        } else {
            this.state.isAppMenuSidebarOpened = true;
        }
    }

    _updateMenuAppsIcon() {
        /** Actualiza la visibilidad del icono de apps, brand y secciones según el estado del HomeMenu. */
        const menuAppsEl = this.menuAppsRef.el;
        if (!menuAppsEl) {
            return;
        }

        // Ocultar el botón de apps si estamos en el HomeMenu sin acción de fondo
        menuAppsEl.classList.toggle("o_hidden", !this.isInApp && !this.hasBackgroundAction);
        // Mostrar flecha de retorno si hay acción de fondo
        menuAppsEl.classList.toggle(
            "o_menu_toggle_back",
            !this.isInApp && this.hasBackgroundAction
        );
        if (!this.isScopedApp) {
            const title =
                !this.isInApp && this.hasBackgroundAction
                    ? _t("Vista anterior")
                    : _t("Menú principal");
            menuAppsEl.title = title;
            menuAppsEl.ariaLabel = title;
        }

        // Ocultar brand y su icono cuando estamos en el HomeMenu
        const menuBrand = this.navRef.el?.querySelector(".o_menu_brand");
        if (menuBrand) {
            menuBrand.classList.toggle("o_hidden", !this.isInApp);
        }

        const menuBrandIcon = this.navRef.el?.querySelector(".o_menu_brand_icon");
        if (menuBrandIcon) {
            menuBrandIcon.classList.toggle("o_hidden", !this.isInApp);
        }

        // Ocultar secciones de submenú cuando estamos en el HomeMenu
        const appSubMenus = this.appSubMenus.el;
        if (appSubMenus) {
            appSubMenus.classList.toggle("o_hidden", !this.isInApp);
        }

        // Ocultar breadcrumbs cuando estamos en el HomeMenu
        const breadcrumb = this.navRef.el?.querySelector(".o_breadcrumb");
        if (breadcrumb) {
            breadcrumb.classList.toggle("o_hidden", !this.isInApp);
        }
    }

    onAllAppsBtnClick() {
        /** En móvil: muestra el HomeMenu y cierra el sidebar. */
        // :method: NavBar.onAllAppsBtnClick addons/web/static/src/webclient/navbar/navbar.js:L221
        super.onAllAppsBtnClick();
        this.hm.toggle(true);
        this._closeAppMenuSidebar();
    }
}
