# Copyright (c) 2026 Soluciones Dimac 21, C.A.
# This source code is subject to the terms of the Odoo Proprietary License (OPL-1).
# Please refer to the LICENSE file for the full licensing terms and conditions.
{
    'name': 'Dimac 21 - Menú Principal',
    'version': '19.0.1.0.0',
    'category': 'Hidden',
    'summary': 'Menú principal para Odoo Community',
    'description': """
        Reemplaza la navegación por defecto de Odoo Community con un menú
        principal profesional: pantalla completa con cuadro de aplicaciones,
        navegación por teclado, y barra de navegación limpia.
    """,
    'author': 'Soluciones Dimac 21, C.A.',
    'website': 'https://dimac21.com',
    'license': 'OPL-1',
    'depends': ['web'],
    'assets': {
        'web._assets_primary_variables': [
            (
                'before',
                'web/static/src/webclient/navbar/navbar.variables.scss',
                'd21_menu/static/src/webclient/navbar/navbar.variables.scss',
            ),
            (
                'before',
                'web/static/src/webclient/navbar/navbar.variables.scss',
                'd21_menu/static/src/webclient/home_menu/home_menu.variables.scss',
            ),
        ],
        'web.assets_backend': [
            'd21_menu/static/src/webclient/**/*.scss',
            'd21_menu/static/src/webclient/**/*.js',
            'd21_menu/static/src/webclient/**/*.xml',
        ],
        'web.assets_web': [
            ('replace', 'web/static/src/main.js', 'd21_menu/static/src/main.js'),
        ],
    },
    'auto_install': False,
    'installable': True,
    'application': False,
}
