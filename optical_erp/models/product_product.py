# -*- coding: utf-8 -*-
from odoo import models, api

import logging
_logger = logging.getLogger(__name__)

class ProductProduct(models.Model):
    _inherit = 'product.product'


    def _for_attribute(self, cabecera, list_v,x):
        for v_id in cabecera:
            list_v.append([v_id])
            if x > 0:
                i = 0
                while i < len(list_v):
                    #print(list_v[i])
                    if v_id not in list_v[i]:
                        sw=0
                        for c in cabecera:
                            if c in list_v[i]:
                                sw=1
                        if list_v[i][0] not in cabecera and sw==0:
                            new = list_v[i].copy()
                            new.append(v_id)
                            list_v.append(new)

                    i += 1

        return list_v

    def _generate_combinations(self,references=[]):
        if not references:
            pass
        else:
            self_product_template_attribute_line = self.env['product.template.attribute.line'].sudo()
            product_product = self.env['product.product'].sudo().search([('default_code','in',references)])
            if product_product:
                for product in product_product:
                    p = product.product_tmpl_id
                    #array_att_lines = []
                    combinations = self.env['product.template.attribute.value'].sudo()
                    if p.attribute_line_ids:
                        array = []
                        for att_line in p.attribute_line_ids:
                            if att_line.value_ids:
                                array.append(att_line.value_ids.ids)
                    list_v = []
                    i=0
                    for line in array:
                        list_v = self._for_attribute(line,list_v,i)
                        i+=1
                    if list_v:
                        for val_ids in list_v:
                            combination = self.env['product.template.attribute.value'].search([('product_attribute_value_id', 'in', val_ids)])
                            if combination:
                                attribute_values = combination.mapped('product_attribute_value_id')

                                if not self._exists_product_by_combination(p, attribute_values):
                                    product = self.env['product.product'].sudo().create({
                                        'product_tmpl_id': p.id,
                                        'attribute_value_ids': [(6, 0, attribute_values.ids)]
                                    })
                                    print(combination)
                                    _logger.info("producto creado default_code %s" % (product.default_code) )
                                else:
                                    _logger.info("Ya existe la combinación para este product template")
                                #product = p._create_product_variant(product_template_attribute_values)
                                a=1


    def _exists_product_by_combination(self,product_tmpl_id, attribute_values):

        product_exists = self.env['product.product'].sudo().search([('product_tmpl_id','=',product_tmpl_id.id),('attribute_value_ids','in',attribute_values.ids)])
        if not product_exists:
            return False

        if product_exists:
            sw=0
            for p in product_exists:
                if sorted(p.attribute_value_ids.ids) == sorted(attribute_values.ids):
                    sw=1
                    break

            if sw==1:
                return True
            else:
                return False


