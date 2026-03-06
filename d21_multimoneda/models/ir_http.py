from odoo import api, models
from odoo.http import request
from odoo.addons.d21_multimoneda.config import CURRENCIES


class IrHttp(models.AbstractModel):
    _inherit = 'ir.http'

    def session_info(self):
        result = super().session_info()

        if request.session.uid:
            Currency = self.env['res.currency'].sudo()
            currencies = Currency.search([('name', 'in', CURRENCIES)])

            available = {
                c.id: {
                    'id': c.id,
                    'code': c.name,
                    'name': c.currency_unit_label,
                    'symbol': c.symbol,
                }
                for c in currencies
            }

            # Default current = first available
            current_id = currencies[0].id if currencies else False

            result['user_currencies'] = {
                'current_currency': current_id,
                'available_currencies': available,
            }
            result['display_switch_currency_menu'] = len(available) > 1

        return result

    @classmethod
    def _post_logout(cls):
        super()._post_logout()
        request.future_response.set_cookie('curr_ids', max_age=0)

    @classmethod
    def _sanitize_cookies(cls, cookies):
        super()._sanitize_cookies(cookies)
        if curr_ids := cookies.get('curr_ids'):
            # Normalize separator to '-' (in case old ',' separator was used)
            cookies['curr_ids'] = '-'.join(curr_ids.split(','))
