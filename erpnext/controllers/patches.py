import frappe
import erpnext
from frappe import enqueue
from frappe import publish_progress

@frappe.whitelist()
def create_item_price_without_batch(price_list):
    if price_list=="Price To Franchaisee - (PTF)":
        item_price_list = frappe.get_list("Item Price", filters={'price_list': price_list})
        for item_price in item_price_list:
            item_price_doc = frappe.get_doc("Item Price", item_price.name)
            if not frappe.db.exists({"doctype":"Item Price", 'item_code':item_price_doc.item_code ,'price_list': price_list, 'batch_no':""}):
                print("in if")
                new_item_price_doc = frappe.new_doc('Item Price')
                new_item_price_doc.price_list = price_list
                new_item_price_doc.item_code = item_price_doc.item_code
                new_item_price_doc.price_list_rate = item_price_doc.price_list_rate
                new_item_price_doc.insert()
                frappe.db.commit()
        frappe.msgprint("Item Price Updation Completed")

@frappe.whitelist()
def update_item_price_from_button(price_list):
    # publish_progress(percent=10, title="Reading the file")
    # frappe.show_progress('Loading..', 70, 100, 'Please wait')
    # frappe.publish_realtime("ocr_progress_bar", {"progress": [5, 10], "reload": 1}, user=frappe.session.user)
    frappe.enqueue(create_item_price_without_batch,price_list=price_list, is_async=True, queue="long")
