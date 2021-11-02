$.fn.serializeObject = function()
{
   var o = {};
   var a = this;
   var a = this.serializeArray();
//    a = a.map(function(obj){
//        var value;
//        if(!isNaN(obj.value))
//            value= parseFloat(obj.value);
//        else if (obj.value == "")
//            value = "";
//        else
//            value=obj.value;
//        return{
//            name:obj.name,
//            value: value
//        };
//    });
   $.each(a, function() {
       if (o[this.name]) {
           if (!o[this.name].push) {
               o[this.name] = [o[this.name]];
               console.log('mira', o[this.name])
           }
           o[this.name].push(this.value || '');
       } else {
           o[this.name] = this.value || '';
       }
   });
   return o;
};