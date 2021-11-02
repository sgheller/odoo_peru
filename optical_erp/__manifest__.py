{
    "name": "Optical ERP",
    "version": "13.0.0.0.1",
    "category": "Optical",
    "version": "13.0.0.0.1",
    'summary': "Solution for Optical(EYE) shops and clinics",
    'description': """
    odoo Solution for Optical(EYE) shops and clinics.
    """,
    "author": "Alhaditech",
    "website": "www.alhaditech.com",
   'license': 'AGPL-3',
    'images': ['static/description/background.png','static/description/background2.png'],
    "depends": [
        'base','sale','doctor', 'point_of_sale'
    ],
    'price': 120, 'currency': 'EUR',
    "data": [
        'security/groups.xml',
        "security/ir.model.access.csv",
        "data/data.xml",
        "data/sequence.xml",
        "report/reports.xml",
        "report/prescription_report.xml",
        "views/prescription.xml",
        "views/res_config_settings_views.xml",
        "views/partner.xml",
        "views/test_type.xml",
        'views/pos_template.xml',
        'views/pos_order_view.xml',
        'views/product_attribute_view.xml',
        'data/optical_pos_product_variants.xml',
    ],
    'qweb': ['static/src/xml/pos.xml', 'static/src/xml/prescription_history.xml'],
    "installable": True,
    'application': True,
}
