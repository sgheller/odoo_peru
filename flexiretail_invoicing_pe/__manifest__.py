# -*- coding: utf-8 -*-
{
    'name': "POS Retail integration FE",

    'summary': """
        Flexiretail integration with Peruvian electronic invoicing
    """,

    'description': """
        Flexiretail integration with Peruvian electronic invoicing
    """,

    'author': "TECHRUNA",
    'website': "http://www.techruna.com",

    "category": "Point Of Sale",
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['l10n_pe_pos_cpe', 'flexiretail_com_advance'],

    # always loaded
    'data': [
        'views/pos_cpe_templates.xml',
    ],
    'qweb': [
        'static/src/xml/pos.xml'
    ],
}