import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SchemaService } from '../services/data/schema.service';
import { GeneralService } from '../services/general/general.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { Location, KeyValue } from '@angular/common';
import { convertSchemaToDraft6 } from 'angular6-json-schema-form';

@Component({
  selector: 'app-layouts',
  templateUrl: './layouts.component.html',
  styleUrls: ['./layouts.component.scss'],
})
export class LayoutsComponent implements OnInit, OnChanges {
  private onCompare(_left: KeyValue<any, any>, _right: KeyValue<any, any>): number {
    return -1;
  }
  @Input() layout;
  @Input() publicData;

  @Input() identifier;
  @Input() public: boolean = false;
  claim: any;
  responseData;
  tab: string = 'profile';
  schemaloaded = false;
  layoutSchema;
  apiUrl: any;
  model: any;
  Data: string[] = [];
  property: any[] = [];
  currentDialog = null;
  destroy = new Subject<any>();
  isPreview: boolean = false;
  name: string;
  address: string;
  headerName: any;
  subHeadername = [];
  params: any;
  langKey;
  titleVal;
  lat: any;
  lng: any;
  camp: any;
  // systemUpdate: boolean = false;
  constructor(
    public location: Location,
    private route: ActivatedRoute,
    public schemaService: SchemaService,
    private titleService: Title,
    public generalService: GeneralService,
    private modalService: NgbModal,
    public router: Router,
    public translate: TranslateService
  ) {}

  ngOnChanges(): void {
    this.Data = [];
    this.ngOnInit();
  }

  ngOnInit(): void {
    // this.getLocation();
    this.subHeadername = [];
    if (this.publicData) {
      this.model = this.publicData;
      this.identifier = this.publicData.osid;
    }

    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.route.params.subscribe((params) => {
      this.params = params;
      if (params['layout'] != undefined) {
        this.layout = params['layout'];
        this.titleService.setTitle(
          params['layout'].charAt(0).toUpperCase() + params['layout'].slice(1)
        );
      }

      if (params.hasOwnProperty('id')) {
        this.identifier = params['id'];
      }

      if (params['layout'] != undefined && params['layout'] == 'admin-prerak') {
        if (params.hasOwnProperty('id')) {
          this.identifier = params['id'];
          localStorage.setItem('id', params['id']);
        } else {
          this.identifier = localStorage.getItem('id');
          this.location.replaceState('profile/admin-prerak/' + this.identifier);
        }
      }

      if (params['layout'] != undefined && params['layout'] == 'ag-detail') {
        if (params.hasOwnProperty('id')) {
          this.identifier = params['id'];
          localStorage.setItem('ag-id', params['id']);
        } else {
          this.identifier = localStorage.getItem('id');
          this.location.replaceState('profile/ag-detail/' + this.identifier);
        }
      }

      if (params['layout'] != undefined && params['layout'] == 'Admin') {
        // this.systemUpdate = true;
        if (params.hasOwnProperty('id')) {
          this.identifier = params['id'];
        } else {
          this.identifier = localStorage.getItem('id');
        }
        // this.generalService.getData('PrerakV2').subscribe(async (res) => {
        //   console.log("in PrerakV2",res)
        //   var prerakName = res[0]["fullName"]
        //   var prerakId = res[0]["osid"]
        //   var parentOrganization = res[0]["parentOrganization"]
        //   await this.generalService.getData('AGV8').subscribe((res2) => {
        //     console.log("in AGV8",res)
        //     res2.forEach(element => {
        //       let ag_data = element;
        //       ag_data["prerakName"] = prerakName;
        //       ag_data["prerakId"] = prerakId;
        //       ag_data["parentOrganization"] = parentOrganization;
        //       this.generalService
        //       .putData("AGV8/", element?.osid, ag_data)
        //       .subscribe(
        //         (res) => {
        //           console.log("ress AGV8 update",res)
        //           if (res.params.status == 'SUCCESSFUL') {
        //             console.log("success")
        //           }
        //         },
        //         (err) => {
        //           console.log('err AGV8 updation',err)
        //         }
        //       );
        //     }

        //     );
        //     this.systemUpdate = false;
        //   });

        // })
      }
      // if (params['layout'] != undefined && params['layout'] == 'PrerakV2') {
      //   this.generalService.getData('PrerakV2').subscribe(async (res) => {
      //     this.generalService.getData('AGV8').subscribe((res2) => {
      //       var prerakId = res[0]['osid'];
      //       res2.forEach((element) => {
      //         let ag_data = element;
      //         ag_data['prerakId'] = prerakId;
      //         this.generalService
      //           .putData('AGV8/', element?.osid, ag_data)
      //           .subscribe(
      //             (res) => {
      //               if (res.params.status == 'SUCCESSFUL') {
      //               }
      //             },
      //             (err) => {
      //               console.log('err--', element);
      //               // console.log('err AGV8 updation', err);
      //             }
      //           );
      //       });
      //     });
      //   });
      // }

      if (params['claim']) {
        this.claim = params['claim'];
      }
      if (params['tab']) {
        this.tab = params['tab'];
      }
      localStorage.setItem('entity', this.layout);
      // this.layout = this.layout.toLowerCase()
    });
    this.schemaService.getSchemas().subscribe(
      async (res) => {
        this.responseData = res;
        this.schemaService.getLayoutJSON().subscribe(
          async (LayoutSchemas) => {
            var filtered = LayoutSchemas.layouts.filter((obj) => {
              return Object.keys(obj)[0] === this.layout;
            });
            console.log("filtered",filtered);
            this.layoutSchema = filtered[0][this.layout];
            if (this.layoutSchema.table) {
              var url = [this.layout, 'attestation', this.layoutSchema.table];
              this.router.navigate([url.join('/')]);
            }
            if (this.layoutSchema.api) {
              this.apiUrl = this.layoutSchema.api;

              if (this.publicData) {
                this.Data = [];
                this.addData();
              } else {
                await this.getData();
              }
            }
          },
          (error) => {
            //Layout Error callback
            console.error(
              'layouts.json not found in src/assets/config/ - You can refer to examples folder to create the file'
            );
          }
        );
      },
      (error) => {
        //Schema Error callback
        console.error('Something went wrong with Schema URL or Path not found');
      }
    );
  }

  check(conStr, title) {
    this.translate.get(this.langKey + '.' + conStr).subscribe((res) => {
      let constr = this.langKey + '.' + conStr;
      if (res != constr) {
        this.titleVal = res;
      } else {
        this.titleVal = title;
      }
    });
    return this.titleVal;
  }

  addData() {
    this.layoutSchema.blocks.forEach((block) => {
      this.property = [];
      block['items'] = [];
      var temp_object;

      if (this.layoutSchema.hasOwnProperty('langKey')) {
        this.langKey = this.layoutSchema.langKey;
      }

      if(localStorage.getItem('isAdminEntity') && localStorage.getItem('isAdminEntity') == "1" && (this.layout == "ag-detail" || this.layout == "admin-prerak")){
        if(block.editform == "ag-setup" || this.layout == "admin-prerak"){
          block.edit = true;
        }
        if(block.editform == "ag-registration-setup"){
          block.claimEdit = true;
          block.add = true;
        }
      }

      if (block.fields.includes && block.fields.includes.length > 0) {
        if (block.fields.includes == '*') {
          for (var element in this.model) {
            if (!Array.isArray(this.model[element])) {
              if (typeof this.model[element] == 'string') {
                temp_object =
                  this.responseData['definitions'][block.definition][
                    'properties'
                  ][element];
                if (temp_object != undefined) {
                  temp_object.property = element;
                  temp_object.title = this.check(element, temp_object.title);
                  temp_object['value'] = this.model[element];
                  this.property.push(temp_object);
                }
              } else {
                for (const [key, value] of Object.entries(
                  this.model[element]
                )) {
                  // console.log("key, value",key, value)
                  if (
                    this.responseData['definitions'][block.definition][
                      'properties'
                    ][element]
                  ) {
                    if (
                      '$ref' in
                      this.responseData['definitions'][block.definition][
                        'properties'
                      ][element]
                    ) {
                      var ref_defination = this.responseData['definitions'][
                        block.definition
                      ]['properties'][element]['$ref']
                        .split('/')
                        .pop();
                      temp_object =
                        this.responseData['definitions'][ref_defination][
                          'properties'
                        ][key];

                      if (
                        temp_object != undefined &&
                        typeof value != 'object'
                      ) {
                        temp_object.property = key;
                        temp_object.title = this.check(key, temp_object.title);
                        temp_object['value'] = value;
                        this.property.push(temp_object);
                      }
                    } else {
                      if (
                        this.responseData['definitions'][block.definition][
                          'properties'
                        ][element]['properties'] != undefined
                      ) {
                        temp_object =
                          this.responseData['definitions'][block.definition][
                            'properties'
                          ][element]['properties'][key];

                        if (
                          temp_object != undefined &&
                          typeof value != 'object'
                        ) {
                          temp_object.property = key;
                          temp_object.title = this.check(
                            key,
                            temp_object.title
                          );
                          temp_object['value'] = value;
                          this.property.push(temp_object);
                        }
                      } else {
                        temp_object =
                          this.responseData['definitions'][block.definition][
                            'properties'
                          ][element];
                        if (temp_object != undefined) {
                          temp_object.property = element;
                          temp_object.title = this.check(
                            element,
                            temp_object.title
                          );
                          temp_object['value'] = this.model[element];
                          this.property.push(temp_object);
                        }
                      }
                    }
                  }
                }
              }
            } else {
              if (
                block.fields.excludes &&
                block.fields.excludes.length > 0 &&
                !block.fields.excludes.includes(element)
              ) {
                this.model[element].forEach((objects) => {
                  for (const [key, value] of Object.entries(objects)) {
                    if (
                      this.responseData['definitions'][block.definition][
                        'properties'
                      ][element]
                    ) {
                      if (
                        '$ref' in
                        this.responseData['definitions'][block.definition][
                          'properties'
                        ][element]
                      ) {
                        var ref_defination = this.responseData['definitions'][
                          block.definition
                        ]['properties'][element]['$ref']
                          .split('/')
                          .pop();
                        temp_object =
                          this.responseData['definitions'][ref_defination][
                            'properties'
                          ][key];
                        if (
                          temp_object != undefined &&
                          typeof value != 'object'
                        ) {
                          temp_object.property = key;
                          temp_object.title = this.check(
                            key,
                            temp_object.title
                          );
                          temp_object['value'] = value;
                          this.property.push(temp_object);
                        }
                      } else {
                        temp_object =
                          this.responseData['definitions'][block.definition][
                            'properties'
                          ][element]['items']['properties'][key];
                        if (
                          temp_object != undefined &&
                          typeof value != 'object'
                        ) {
                          temp_object.property = key;
                          temp_object.title = this.check(
                            key,
                            temp_object.title
                          );
                          temp_object['value'] = value;
                          this.property.push(temp_object);
                        }
                      }
                    }
                  }
                });
              }
            }
          }
        } else {
          block.fields.includes.forEach((element) => {

            if (this.model[element] && !Array.isArray(this.model[element])) {
              for (const [key, value] of Object.entries(this.model[element])) {
                if (
                  this.responseData['definitions'][block.definition][
                    'properties'
                  ][element]
                ) {
                  if (
                    '$ref' in
                    this.responseData['definitions'][block.definition][
                      'properties'
                    ][element]
                  ) {
                    var ref_defination = this.responseData['definitions'][
                      block.definition
                    ]['properties'][element]['$ref']
                      .split('/')
                      .pop();
                    temp_object =
                      this.responseData['definitions'][ref_defination][
                        'properties'
                      ][key];
                    if (temp_object != undefined && typeof value != 'object') {
                      if (element.osid) {
                        temp_object['osid'] = element.osid;
                      }
                      if (element.osid) {
                        temp_object['_osState'] = element._osState;
                        // if(element.hasOwnProperty("_osClaimNotes")){
                        //   temp_object['_osClaimNotes'] = element._osClaimNotes;
                        // }
                      }

                      temp_object.property = key;
                      temp_object.title = this.check(key, temp_object.title);
                      temp_object['value'] = value;
                      this.property.push(temp_object);
                    }
                  } else {
                    temp_object =
                      this.responseData['definitions'][block.definition][
                        'properties'
                      ][element]['properties'][key];
                    if (temp_object != undefined && typeof value != 'object') {
                      if (element.osid) {
                        temp_object['osid'] = element.osid;
                      }
                      if (element.osid) {
                        temp_object['_osState'] = element._osState;
                      }

                      temp_object.property = key;
                      temp_object.title = this.check(key, temp_object.title);
                      temp_object['value'] = value;
                      this.property.push(temp_object);
                    }
                  }
                }
              }
            } else {
              if (this.model[element]) {
                // this.model[element].forEach((objects, i) => {
                for (let i = 0; i < this.model[element].length; i++) {
                  let objects = this.model[element][i];
                  var osid;
                  var osState;
                  var temp_array = [];

                  // alert(i + ' ----1--- ' + objects.osid);

                  let tempName =
                    localStorage.getItem('entity').toLowerCase() +
                    element.charAt(0).toUpperCase() +
                    element.slice(1);
                  tempName =
                    localStorage.getItem('entity') == 'student' ||
                    localStorage.getItem('entity') == 'Student'
                      ? 'studentInstituteAttest'
                      : tempName;
                  if (this.model.hasOwnProperty(tempName)) {
                    let objects1;
                    var tempObj = [];
                    //this.model[tempName].forEach((objects1, j) => {
                    for (let j = 0; j < this.model[tempName].length; j++) {
                      objects1 = this.model[tempName][j];

                      if (objects.osid == objects1.propertiesOSID[element][0]) {
                        objects1.propertiesOSID.osUpdatedAt = new Date(
                          objects1.propertiesOSID.osUpdatedAt
                        );
                        tempObj.push(objects1);
                      }
                    }

                    if (tempObj.length) {
                      tempObj.sort(
                        (a, b) =>
                          b.propertiesOSID.osUpdatedAt -
                          a.propertiesOSID.osUpdatedAt
                      );
                      this.model[element][i]['_osState'] = tempObj[0]._osState;
                    }
                  }

                  for (const [index, [key, value]] of Object.entries(
                    Object.entries(objects)
                  )) {
                    // console.log("key, value",key, value)
                    if (
                      '$ref' in
                      this.responseData['definitions'][block.definition][
                        'properties'
                      ][element]
                    ) {
                      var ref_defination = this.responseData['definitions'][
                        block.definition
                      ]['properties'][element]['$ref']
                        .split('/')
                        .pop();
                      temp_object =
                        this.responseData['definitions'][ref_defination][
                          'properties'
                        ][key];
                      if (
                        temp_object != undefined &&
                        typeof value != 'object'
                      ) {
                        if (objects.osid) {
                          temp_object['osid'] = objects.osid;
                        }
                        if (objects.osid) {
                          temp_object['_osState'] = objects._osState;
                        }

                        temp_object.property = key;
                        temp_object.title = this.check(key, temp_object.title);
                        temp_object['value'] = value;
                        temp_array.push(this.pushData(temp_object));
                      }
                    } else {
                      temp_object =
                        this.responseData['definitions'][block.definition][
                          'properties'
                        ][element]['items']['properties'][key];

                      if (
                        temp_object != undefined &&
                        temp_object.hasOwnProperty('title')
                      ) {
                        temp_object.property = key;
                        temp_object.title = this.check(key, temp_object.title);
                      }

                      if (
                        temp_object != undefined &&
                        typeof value != 'object'
                      ) {
                        if (objects.osid) {
                          temp_object['osid'] = objects.osid;
                        }
                        if (objects.osid) {
                          temp_object['_osState'] = objects._osState;
                        }

                        temp_object.property = key;
                        temp_object.title = this.check(key, temp_object.title);
                        temp_object['value'] = value;
                        temp_array.push(this.pushData(temp_object));
                      }
                      // }
                    }
                  }
                  this.property.push(temp_array);
                }
              }
            }
          });
        }
      }
      if (block.fields.excludes && block.fields.excludes.length > 0) {
        block.fields.excludes.forEach((element) => {
          if (this.property.hasOwnProperty(element)) {
            delete this.property[element];
          }
        });
      }

      if (block.hasOwnProperty('propertyShowFirst') && this.property.length) {
        let fieldsArray = this.property[0].length
          ? this.property[0]
          : this.property;
        let fieldsArrayTemp = [];

        for (let i = 0; i < block.propertyShowFirst.length; i++) {
          fieldsArray = fieldsArray.filter(function (obj) {
            if (obj.property === block.propertyShowFirst[i]) {
              fieldsArrayTemp.push(obj);
            }
            return obj.property !== block.propertyShowFirst[i];
          });
        }

        this.property = this.property[0].length
          ? [fieldsArrayTemp.concat(fieldsArray)]
          : fieldsArrayTemp.concat(fieldsArray);
      }

      if(block.showOnlyFirst && this.property[0]){
        block.items.push([this.property[0]]);
      }else{
        block.items.push(this.property);
      }
      // block.items.push(this.property);
      this.Data.push(block);
      this.schemaloaded = true;
    });
  }

  pushData(data) {
    var object = {};
    for (var key in data) {
      if (data.hasOwnProperty(key)) object[key] = data[key];
    }
    return object;
  }

  async deleteBlock(id) {
    if (confirm('Are you sure you want to delete this record?')) {
      await this.generalService.deleteRecord(id).subscribe((res) => {
        this.router.navigate(['/login']);
      });
    }
  }
  checkArray(arr, arr2) {
    return arr.every((i) => arr2.includes(i));
  }

  async getData() {
    var get_url;
    if (this.identifier) {
      get_url = this.apiUrl + '/' + this.identifier;
    } else {
      get_url = this.apiUrl;
    }
    await this.generalService.getData(get_url).subscribe(async (res) => {
      if (this.identifier) {
        this.model = res;
      } else {
        res.forEach((element) => {
          if (
            element.osOwner[0] == localStorage.getItem('LoggedInKeyclockID')
          ) {
            this.model = element;
            this.identifier = element.osid;
          }
        });
      }
      if (this.layout != undefined && this.layout == 'admin-prerak' && res && res['campId']) {
        let filter = {"filters":{"osid":{"contains":res['campId']}}}
        await this.generalService.postData("/CampV2/search",filter).subscribe(async (res2) => {
          console.log(res2);
          this.camp = res2[0]
        })
      }

      this.getHeadingTitle(this.model);

      this.Data = [];
      console.log("layout",this.layout)
      if(this.layout == 'PrerakV2' || this.layout == 'Prerak'){
        localStorage.setItem('osid', this.identifier);
      }

      // if (this.model['whereStudiedLast']) {
      //   var docs = []
      //   if (this.model['whereStudiedLast'] == 'प्राइवेट स्कूल') {
      //   docs = [
      //     'टीसी (CBO या उच्चतर माध्यमिक सरकारी स्कूल के प्रधानाचार्य द्वारा भेरिफाइड और हस्ताक्षरित)',
      //     'मार्कशीट (CBO या उच्चतर माध्यमिक सरकारी स्कूल के प्रधानाचार्य द्वारा भेरिफाइड और हस्ताक्षरित)',
      //     '2 फोटो',
      //     'जनाधार कार्ड',
      //     'किशोरी का बैंक पासबुक (स्वयं या संयुक्त खाता)',
      //     'मोबाइल नंबर',
      //     'ईमेल आईडी',
      //   ];
      // } else if(this.model['whereStudiedLast'] == 'सरकारी स्कूल') {
      //   docs = [
      //     'टीसी',
      //     'मार्कशीट',
      //     '2 फोटो',
      //     'जनाधार कार्ड',
      //     'किशोरी का बैंक पासबुक (स्वयं या संयुक्त खाता)',
      //     'मोबाइल नंबर',
      //     'ईमेल आईडी',
      //   ];
      // }
      //   var in_doc = [];

      //   if (
      //     this.model['AGDocumentsV3'] &&
      //     Array.isArray(this.model['AGDocumentsV3'])
      //   ) {
      //     this.model['AGDocumentsV3'].forEach((element) => {
      //       if (docs.includes(element['document'])) {
      //         in_doc.push(element['document']);
      //       }
      //     });
      //   }
      //   console.log("in_doc",in_doc,docs);
      //   var doc_statuses = [];
      //   if (this.checkArray(docs, in_doc)) {
      //     if (Array.isArray(this.model['AGDocumentsV3'])) {
      //       this.model['AGDocumentsV3'].forEach((docmnt) => {
      //         console.log(docmnt)
      //         doc_statuses.push(docmnt['status']);
      //       });
      //     }
      //   }
      //   console.log("doc_statuses",doc_statuses)

      //   // उपलब्ध, सुधार की आवश्यकता नहीं
      //   // var is_valid = doc_statuses.every( (val, i, arr) => val === arr[0] );
      //   var is_valid = false;
      //   if(doc_statuses.length > 0){
      //     is_valid = doc_statuses.every(
      //       (val, i, arr) => val === 'उपलब्ध, सुधार की आवश्यकता नहीं'
      //     );
      //   }

      //   console.log("is_valid",is_valid,doc_statuses)
      //   if (!is_valid) {
      //     delete this.layoutSchema.blocks[1];
      //   }
      // }

      // if(this.model['prerakName']){
      //   await this.generalService.getData('PrerakV2').subscribe((res) => {
      //     if(res[0]){
      //        this.model['prerakName'] = res[0]['fullName'];
      //     this.model['parentOrganization'] = res[0]['parentOrganization']?res[0]['parentOrganization']:'';
      //     this.addData();
      //     }

      //   });
      // }else{
      //   this.addData();
      // }
      this.addData();
    },
    error => {

      if(this.layout == "CampV2"){
        this.router.navigate(['/form/Camp-add']);
      }
    },
    () => {
      // 'onCompleted' callback.
      // No errors, route to new page here
    });
  }

  includeFields(fields) {
    fields.forEach((element) => {
      if (typeof element == 'object') {
        element.forEach((ref) => {
          this.property[ref] = this.model[element][ref];
        });
      } else {
        this.property[element] = this.model[element];
      }
    });
  }

  removeCommonFields() {
    var commonFields = [
      'osCreatedAt',
      'osCreatedBy',
      'osUpdatedAt',
      'osUpdatedBy',
      'osid',
      'OsUpdatedBy',
    ];
    const filteredArray = this.property.filter(function (x, i) {
      return commonFields.indexOf(x[i]) < 0;
    });
  }


  ngOnDestroy() {
    this.destroy.next();
  }

  openPreview() {
    this.isPreview = true;
  }

  getHeadingTitle(item) {
    if (this.layoutSchema.hasOwnProperty('headerName')) {
      var propertySplit = this.layoutSchema.headerName.split('.');

      let fieldValue = [];

      for (let j = 0; j < propertySplit.length; j++) {
        let a = propertySplit[j];

        if (j == 0 && item.hasOwnProperty(a)) {
          fieldValue = item[a];
        } else if (fieldValue.hasOwnProperty(a)) {
          fieldValue = fieldValue[a];
        } else if (fieldValue[0]) {
          let arryItem = [];
          if (fieldValue.length > 0) {
            for (let i = 0; i < fieldValue.length; i++) {
              //  arryItem.push({ 'value': fieldValue[i][a], "status": fieldValue[i][key.attest] });
            }

            fieldValue = arryItem;
          } else {
            fieldValue = fieldValue[a];
          }
        } else {
          fieldValue = [];
        }
      }

      this.headerName = fieldValue;
      this.getSubHeadername(item);
    }
  }

  getSubHeadername(item) {
    if (this.layoutSchema.hasOwnProperty('subHeadername')) {
      var propertySplit = this.layoutSchema.subHeadername.split(',');

      let fieldValue = [];

      for (let k = 0; k < propertySplit.length; k++) {
        var propertyKSplit = propertySplit[k].split('.');

        for (let j = 0; j < propertyKSplit.length; j++) {
          let a = propertyKSplit[j];

          if (j == 0 && item.hasOwnProperty(a)) {
            fieldValue = item[a];
          } else if (fieldValue.hasOwnProperty(a)) {
            fieldValue = fieldValue[a];
          } else if (fieldValue[0]) {
            let arryItem = [];
            if (fieldValue.length > 0) {
              fieldValue = arryItem;
            } else {
              fieldValue = fieldValue[a];
            }
          } else {
            fieldValue = [];
          }
        }

        fieldValue.length ? this.subHeadername.push(fieldValue) : [];
      }
    }
  }

  getTitle(text){
    var commonFields = [
      'osCreatedAt',
      'osCreatedBy',
      'osUpdatedAt',
      'osUpdatedBy',
      'osid',
      'OsUpdatedBy',
      'RSOS_NIOSRegId',
      'osOwner',
      'sorder'
    ];
    if(!commonFields.includes(text)){
      const result = text.replace(/([A-Z])/g, " $1");
      const finalResult = result.charAt(0).toUpperCase() + result.slice(1);
      return finalResult;
    }else{
      return false;
    }

  }
  // getLocation() {
  //   if (navigator.geolocation) {
  //     navigator.geolocation.getCurrentPosition(
  //       (position: Position) => {
  //         if (position) {
  //           this.lat = position.coords.latitude;
  //           this.lng = position.coords.longitude;
  //           this.model['geoLocation'] = this.lat + ',' + this.lng;
  //         }
  //       },
  //       (error: PositionError) => console.log(error)
  //     );
  //   } else {
  //     alert('Geolocation is not supported by this browser.');
  //   }
  // }
}
