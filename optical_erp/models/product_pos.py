from odoo import models, api
import json

class ProductFromPos(models.Model):
    _inherit = 'dr.prescription'

    @api.model
    def create_product_pos(self, vals):
        vals = json.loads(vals)
        print(vals)
        vals["state"] = "Confirm"
        if vals["dual_pd"] == "on":
            vals["dual_pd"] =True
        else:
            vals["dual_pd"] = False
        rec = self.env['dr.prescription'].create(vals)
        new_vals = self.env['optical.dr'].search([('id', '=', vals["dr"])])
        vals["dr"] = {}
        vals["dr"][0] = new_vals.id
        vals["dr"][1] = new_vals.name
        new_vals = self.env['eye.test.type'].search([('id', '=', vals["test_type"])])
        vals["test_type"] = {}
        vals["test_type"][0] = new_vals.id
        vals["test_type"][1] = new_vals.name
        new_vals = self.env['res.partner'].search([('id', '=', vals["customer"])])
        vals["customer"] = {}
        vals["customer"][0] = new_vals.id
        vals["customer"][1] = new_vals.name
        vals["id"] = rec.id
        print('Valor', vals)
        return vals