# Copyright (c) 2026 Soluciones Dimac 21, C.A.
# This source code is subject to the terms of the Odoo Proprietary License (OPL-1).
# Please refer to the LICENSE file for the full licensing terms and conditions.

{
    'name': 'Dimac 21 - Base',
    'version': '1.0',
    'summary': 'Módulo base para la localización de Dimac 21',
    'category': 'Hidden',
    'author': 'Soluciones Dimac 21, C.A.',
    'license': 'OPL-1',
    'depends': [
        'base',
        'accountant',
        'sale_management',
        'purchase',
        'stock',
    ],
    'data': [],
    'installable': True,
    'auto_install': False,
    'application': False,
}
