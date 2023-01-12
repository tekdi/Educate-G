import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SchemaService } from '../services/data/schema.service';
import { FormControl, FormGroup } from '@angular/forms';
import { FormlyFormOptions, FormlyFieldConfig } from '@ngx-formly/core';
import { FormlyJsonschema } from '@ngx-formly/core/json-schema';
import { JSONSchema7 } from 'json-schema';
import { GeneralService } from '../services/general/general.service';
import { Location } from '@angular/common';
import { of } from 'rxjs';
import { ToastMessageService } from '../services/toast-message/toast-message.service';
import { of as observableOf } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { throwError } from 'rxjs';
import { LocationService } from '../services/location/location.service';
import { startWith, switchMap } from 'rxjs/operators';
import { stringify } from '@angular/compiler/src/util';
import { KeycloakService } from 'keycloak-angular';
import * as Sentry from '@sentry/angular';

declare const $: any;

const RSOS_PehlaPrayas = 'RSOS पहला प्रयास';
const NSOS_PehlaPrayas = 'NIOS पहला प्रयास';
const RSOS_PurakPrayas = 'RSOS पूरक प्रयास';
const NSOS_PurakPrayas = 'NIOS पूरक प्रयास';
const privateSchoolEnums = [
  'टीसी (CBO या उच्चतर माध्यमिक सरकारी स्कूल के प्रधानाचार्य द्वारा भेरिफाइड और हस्ताक्षरित)',
  'मार्कशीट (CBO या उच्चतर माध्यमिक सरकारी स्कूल के प्रधानाचार्य द्वारा भेरिफाइड और हस्ताक्षरित)',
  '2 फोटो',
  'जनाधार कार्ड',
  'किशोरी का बैंक पासबुक (स्वयं या संयुक्त खाता)',
  'मोबाइल नंबर',
  'ईमेल आईडी',
];
const sarkariSchoolEnums = [
  'टीसी',
  'मार्कशीट',
  '2 फोटो',
  'जनाधार कार्ड',
  'किशोरी का बैंक पासबुक (स्वयं या संयुक्त खाता)',
  'मोबाइल नंबर',
  'ईमेल आईडी',
];
const noSchoolEnums = [
  'जन्मा प्रमाण पत्',
  'जाती प्रमाण पत्र',
  'राशन कार्ड',
  'BPL प्रमाण पत्र',
  '2 फोटो',
  'जनाधार कार्ड',
];
@Component({
  selector: 'app-forms',
  templateUrl: './forms.component.html',
  styleUrls: ['./forms.component.scss'],
})
export class FormsComponent implements OnInit {
  @Input() form;
  @Input() modal;
  @Input() identifier;
  res: any;
  formSchema;
  responseData;
  schemaloaded = false;
  schema: JSONSchema7 = {
    type: 'object',
    title: '',
    definitions: {},
    properties: {},
  };
  definations = {};
  property = {};
  ordering;
  required = [];
  entityId: string;
  form2: FormGroup;
  model = {};
  options: FormlyFormOptions;
  fields: FormlyFieldConfig[];
  customFields = [];
  header = null;
  exLength: number = 0;
  type: string;
  apiUrl: string;
  redirectTo: any;
  add: boolean;
  dependencies: any;
  privateFields = [];
  internalFields = [];
  privacyCheck: boolean = false;
  globalPrivacy;
  searchResult: any[];
  states: any[] = [];
  fileFields: any[] = [];
  propertyName: string;
  notes: any;
  langKey: string;
  headingTitle;
  enumVal;
  titleVal;
  isSignupForm: boolean = false;
  entityUrl: any;
  propertyId: any;
  entityName: string;
  sorder: any;
  isSubmitForm: boolean = false;
  adminForm: string;
  isThisAdminRole: boolean = false;
  lat: any;
  lng: any;
  adminRole: boolean;
  errMsg: string;
  subjectsLoaded: boolean = false;

  constructor(
    private route: ActivatedRoute,
    public translate: TranslateService,
    public locationService: LocationService,
    public toastMsg: ToastMessageService,
    public router: Router,
    public schemaService: SchemaService,
    private formlyJsonschema: FormlyJsonschema,
    public generalService: GeneralService,
    private location: Location,
    public keycloak: KeycloakService
  ) {}

  ngOnInit(): void {
    this.keycloak.loadUserProfile().then((res) => {
      this.adminRole = this.keycloak.isUserInRole('admin', res['username']);
    });

    this.route.params.subscribe((params) => {
      console.log(params);
      this.add = this.router.url.includes('claim:add');
      
      if (params['form'] != undefined) {
        this.form = params['form'].split('/', 1)[0];
        this.identifier = params['form'].split('/', 2)[1];

        if (
          this.form == 'prerak-admin-setup' ||
          this.form == 'interview' ||
          this.form == 'ag-setup'
        ) {
          this.isThisAdminRole = true;
        }
      }

      if (params['id'] != undefined) {
        this.identifier = params['id'];
      }
      if (params['modal'] != undefined) {
        this.modal = params['modal'];
      }

      if (params.hasOwnProperty('id')) {
        this.identifier = params['id'];
      }
      if (
        params['form'] != undefined &&
        (params['form'] == 'prerak-admin-setup' ||
          params['form'] == 'interview' ||
          params['form'] == 'ag-setup')
      ) {
        this.adminForm = params['form'];

        if (params.hasOwnProperty('id')) {
          this.identifier = params['id'];
          localStorage.setItem('id', params['id']);
        } else {
          this.identifier = localStorage.getItem('id');
          //this.propertyName = 'Prerak';
        }
      }

      if (params['form'] == 'add-prerak-admin-setup') {
        this.adminForm = params['form'];
      }
    });

    this.entityName = localStorage.getItem('entity');

    this.schemaService.getFormJSON().subscribe(
      (FormSchemas) => {
        var filtered = FormSchemas.forms.filter((obj) => {
          return Object.keys(obj)[0] === this.form;
        });
        this.formSchema = filtered[0][this.form];
      
        if (this.formSchema.hasGeolocation) {
          this.getLocation();
        }

        if (this.formSchema.api) {
          this.apiUrl = this.formSchema.api;
          this.entityUrl = this.formSchema.api;
        }

        if (this.formSchema.header) {
          this.header = this.formSchema.header;
        }

        if (this.formSchema.isSignupForm) {
          this.isSignupForm = this.formSchema.isSignupForm;
        }

        if (this.formSchema.title) {
          this.headingTitle = this.translate.instant(this.formSchema.title);
        }

        if (this.formSchema.redirectTo) {
          if (
            this.adminRole &&
            (this.form === 'ag-setup' || this.form === 'AG-add')
          ) {
            this.redirectTo = '/myags/attestation/ag/AGV8';
          } else {
            this.redirectTo = this.formSchema.redirectTo;
          }
        }

        if (this.formSchema.type) {
          this.type = this.formSchema.type;
        }

        if (this.formSchema.langKey) {
          this.langKey = this.formSchema.langKey;
        }

        if (this.type != 'entity') {
          this.propertyName = this.type.split(':')[1];
          this.propertyId = this.identifier;
          this.getEntityData(this.apiUrl);
        }

        this.schemaService.getSchemas().subscribe(
          async (res) => {
            this.responseData = res;
            this.formSchema.fieldsets.forEach((fieldset) => {
              if (fieldset.hasOwnProperty('privacyConfig')) {
                this.privacyCheck = true;
                this.privateFields = this.responseData.definitions[
                  fieldset.privacyConfig
                ].hasOwnProperty('privateFields')
                  ? this.responseData.definitions[fieldset.privacyConfig]
                      .privateFields
                  : [];
                this.internalFields = this.responseData.definitions[
                  fieldset.privacyConfig
                ].hasOwnProperty('internalFields')
                  ? this.responseData.definitions[fieldset.privacyConfig]
                      .internalFields
                  : [];
              }
              this.getData();

              this.definations[fieldset.definition] = {};
              this.definations[fieldset.definition]['type'] = 'object';
              if (fieldset.title) {
                this.definations[fieldset.definition]['title'] =
                  this.generalService.translateString(
                    this.langKey + '.' + fieldset.title
                  );
              }

              if (fieldset.required && fieldset.required.length > 0) {
                this.definations[fieldset.definition]['required'] =
                  fieldset.required;
              }

              if (fieldset.dependencies) {
                let _self = this;
                Object.keys(fieldset.dependencies).forEach(function (key) {
                  let above13 = fieldset.dependencies[key];
                  if (typeof above13 === 'object') {
                    Object.keys(above13).forEach(function (key1) {
                      let oneOf = above13[key1];

                      if (oneOf.length) {
                        for (let i = 0; i < oneOf.length; i++) {
                          if (oneOf[i].hasOwnProperty('properties')) {
                            Object.keys(oneOf[i].properties).forEach(function (
                              key2
                            ) {
                              let pro = oneOf[i].properties[key2];

                              if (pro.hasOwnProperty('properties')) {
                                Object.keys(pro['properties']).forEach(
                                  function (key3) {
                                    if (
                                      pro.properties[key3].hasOwnProperty(
                                        'title'
                                      )
                                    ) {
                                      fieldset.dependencies[key][key1][
                                        i
                                      ].properties[key2].properties[key3][
                                        'title'
                                      ] = _self.translate.instant(
                                        pro.properties[key3].title
                                      );
                                    }
                                  }
                                );
                              }
                            });
                          }
                        }
                      }
                    });
                  }
                });

                this.dependencies = fieldset.dependencies;
              }

              this.definations[fieldset.definition].properties = {};
              this.property[fieldset.definition] = {};

              this.property = this.definations[fieldset.definition].properties;

              if (fieldset.formclass) {
                this.schema['widget'] = {};
                this.schema['widget']['formlyConfig'] = {
                  fieldGroupClassName: fieldset.formclass,
                };
              }

              if (fieldset.fields[0] === '*') {
                this.definations = this.responseData.definitions;
                this.property =
                  this.definations[fieldset.definition].properties;
                fieldset.fields = this.property;
                this.addFields(fieldset);
              } else {
                this.addFields(fieldset);
              }

              if (fieldset.except) {
                this.removeFields(fieldset);
              }
            });

            this.ordering = this.formSchema.order;
            this.schema['type'] = 'object';
            this.schema['title'] = this.formSchema.title;
            this.schema['definitions'] = this.definations;
            this.schema['properties'] = this.property;
            this.schema['required'] = this.required;
            this.schema['dependencies'] = this.dependencies;
            await this.loadSchema();
            this.schemaloaded = true;


          },
          (error) => {
            this.toastMsg.error(
              'error',
              this.translate.instant('SOMETHING_WENT_WRONG_WITH_SCHEMA_URL')
            );
          }
        );
      },
      (error) => {
        this.toastMsg.error(
          'error',
          'forms.json not found in src/assets/config/ - You can refer to examples folder to create the file'
        );
      }
    );
    setTimeout(() => {
      this.subjectsLoaded = true;
      console.log("subjectsLoaded",this.subjectsLoaded)
    }, 3000);
  }

  loadSchema() {
    this.form2 = new FormGroup({});
    this.options = {};
    this.fields = [this.formlyJsonschema.toFieldConfig(this.schema)];

    if (this.privacyCheck) {
      this.visilibity(this.fields);
    }

    if (this.headingTitle) {
      this.fields[0].templateOptions.label = '';
    }
    if (this.add && this.form == 'AG-add') {
      this.model = {};
      this.model['AgAddress'] = {
        district: null,
        block: null,
      };
      // {
      // address: {
      //   district: null,
      //   block: null,
      // },
      // confirmAddress: {
      //   district: null,
      //   block: null,
      // },
      // AgAddress: {
      //   district: null,
      //   block: null,
      // },
      // };
    } else if (this.add && this.form == 'prerak-admin-setup') {
      this.model = {};
      this.model['address'] = {
        district: null,
        block: null,
      };
      this.model['confirmAddress'] = {
        district: null,
        block: null,
      };
      // this.model = {
      //   address: {
      //     district: null,
      //     block: null,
      //   },
      //   confirmAddress: {
      //     district: null,
      //     block: null,
      //   }
      // };
    }

    // this.schemaloaded = true;
  }

  visilibity(fields) {
    if (
      fields[0].fieldGroup.length > 1 &&
      fields[0].fieldGroup[0].type == 'object'
    ) {
      fields[0].fieldGroup.forEach((fieldObj) => {
        if (this.privateFields.length || this.internalFields.length) {
          let label = fieldObj.templateOptions.label;
          let key = fieldObj.key.replace(/^./, fieldObj.key[0].toUpperCase());

          if (
            this.schema.definitions[key] &&
            this.schema.definitions[key].hasOwnProperty('description')
          ) {
            let desc = this.checkString(
              fieldObj.key,
              this.schema.definitions[key]['description']
            );
            fieldObj.templateOptions.label = label ? label : desc;
          }

          if (this.privateFields.indexOf('$.' + fieldObj.key) >= 0) {
            fieldObj.templateOptions['addonRight'] = {
              class: 'private-access d-flex flex-column',
              text: this.translate.instant('ONLY_BY_CONSENT'),
            };
            fieldObj.templateOptions.description = this.translate.instant(
              'VISIBILITY_ATTRIBUTE_DEFINE'
            );
          } else if (this.internalFields.indexOf('$.' + fieldObj.key) >= 0) {
            fieldObj.templateOptions['addonRight'] = {
              class: 'internal-access d-flex flex-column',
              text: this.translate.instant('ONLY_BY_ME'),
            };
            fieldObj.templateOptions.description = this.translate.instant(
              'VISIBILITY_ATTRIBUTE_DEFINE'
            );
          }
        } else {
          fieldObj.templateOptions['addonRight'] = {
            class: 'public-access d-flex flex-column',
            text: this.translate.instant('ANYONE'),
          };
          fieldObj.templateOptions.description = this.translate.instant(
            'VISIBILITY_ATTRIBUTE_DEFINE'
          );
        }
      });
    } else {
      if (this.privateFields.indexOf('$.' + fields[0].fieldGroup[0].key) >= 0) {
        this.globalPrivacy = 'private-access';
      } else if (
        this.internalFields.indexOf('$.' + fields[0].fieldGroup[0].key) >= 0
      ) {
        this.globalPrivacy = 'internal-access';
      } else if (!this.privateFields.length && !this.internalFields.length) {
        this.globalPrivacy = 'public-access';
      }
    }
  }

  checkProperty(fieldset, field) {
    this.definations[field.children.definition] =
      this.responseData.definitions[field.children.definition];
    var ref_properties = {};
    var ref_required = [];
    if (field.children.fields && field.children.fields.length > 0) {
      field.children.fields.forEach((reffield) => {
        this.addWidget(field.children, reffield, field.name);

        if (reffield.required) {
          ref_required.push(reffield.name);
        }

        ref_properties[reffield.name] =
          this.responseData.definitions[field.children.definition].properties[
            reffield.name
          ];
      });

      if (
        this.responseData.definitions[
          fieldset.definition
        ].properties.hasOwnProperty(field.name)
      ) {
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ].properties = ref_properties;
      } else {
        this.responseData.definitions[fieldset.definition].properties =
          ref_properties;
      }
      this.definations[field.children.definition].properties = ref_properties;
      this.definations[field.children.definition].required = ref_required;
    }
  }

  nastedChild(fieldset, fieldName, res) {
    let tempArr = res;

    let temp_arr_fields = [];
    let nastedArr = [];

    for (const key in tempArr) {
      if (
        tempArr[key].hasOwnProperty('type') &&
        tempArr[key].type == 'string'
      ) {
        if (tempArr[key].type == 'string') {
          temp_arr_fields.push({ name: key, type: tempArr[key].type });
        }
      } else {
        let res =
          this.responseData.definitions[
            fieldName.replace(/^./, fieldName[0].toUpperCase())
          ].properties[key];
        if (res.hasOwnProperty('properties') || res.hasOwnProperty('$ref')) {
          this.responseData.definitions[
            fieldName.replace(/^./, fieldName[0].toUpperCase())
          ].properties[key].properties = tempArr[key].properties;

          for (const key1 in tempArr[key].properties) {
            nastedArr.push({
              name: key1,
              type: tempArr[key].properties[key1].type,
            });
          }
          delete this.responseData.definitions[
            fieldName.replace(/^./, fieldName[0].toUpperCase())
          ].properties[key]['$ref'];

          let temp2 = {
            children: {
              definition:
                fieldName.replace(/^./, fieldName[0].toUpperCase()) +
                '.properties.' +
                key,
              fields: nastedArr,
            },
            name: key.toLowerCase(),
          };

          temp_arr_fields.push(temp2);
          temp2.children.fields.forEach((reffield) => {
            this.addChildWidget(reffield, fieldName, key);
          });
        } else {
          delete this.responseData.definitions[
            fieldName.replace(/^./, fieldName[0].toUpperCase())
          ].properties[key];
        }
      }
    }
    let temp_field = {
      children: {
        definition: fieldName.replace(/^./, fieldName[0].toUpperCase()),
        fields: temp_arr_fields,
      },
      name: fieldName,
    };
    this.checkProperty(fieldset, temp_field);
  }

  addFields(fieldset) {
    if (fieldset.fields.length) {
      fieldset.fields.forEach((field) => {
        if (
          this.responseData.definitions[fieldset.definition] &&
          this.responseData.definitions[fieldset.definition].hasOwnProperty(
            'properties'
          )
        ) {
          let res =
            this.responseData.definitions[fieldset.definition].properties;
          if (field.children) {
            this.checkProperty(fieldset, field);

            if (
              this.responseData.definitions[fieldset.definition].properties[
                field.name
              ].hasOwnProperty('properties')
            ) {
              let _self = this;
              Object.keys(
                _self.responseData.definitions[fieldset.definition].properties[
                  field.name
                ].properties
              ).forEach(function (key) {
                if (
                  _self.responseData.definitions[
                    fieldset.definition
                  ].properties[field.name].properties[key].hasOwnProperty(
                    'properties'
                  )
                ) {
                  Object.keys(
                    _self.responseData.definitions[fieldset.definition]
                      .properties[field.name].properties[key].properties
                  ).forEach(function (key1) {
                    _self.responseData.definitions[
                      fieldset.definition
                    ].properties[field.name].properties[key].properties[
                      key1
                    ].title = _self.checkString(
                      key1,
                      _self.responseData.definitions[fieldset.definition]
                        .properties[field.name].properties[key].properties[key1]
                        .title
                    );
                  });
                }
              });
            }
          } else if (
            this.responseData.definitions[
              fieldset.definition
            ].properties.hasOwnProperty(field.name) &&
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ].hasOwnProperty('properties')
          ) {
            let res =
              this.responseData.definitions[fieldset.definition].properties[
                field.name
              ].properties;
            this.nastedChild(fieldset, field.name, res);
          }
        }

        if (field.validation) {
          if (field.validation.hasOwnProperty('message')) {
            field.validation['message'] = this.translate.instant(
              field.validation.message
            );
          }
        }

        if (field.children) {
          if (field.children.fields) {
            for (let i = 0; i < field.children.fields.length; i++) {
              if (
                field.children.fields[i].hasOwnProperty('validation') &&
                field.children.fields[i].validation.hasOwnProperty('message')
              ) {
                field.children.fields[i].validation['message'] =
                  this.translate.instant(
                    field.children.fields[i].validation.message
                  );
                this.responseData.definitions[fieldset.definition].properties[
                  field.name
                ].properties[field.children.fields[i].name]['widget'][
                  'formlyConfig'
                ]['validation']['messages']['pattern'] = this.translate.instant(
                  field.children.fields[i].validation.message
                );
              }
            }
          }
        }
        if (field.data && field.data.type == 'api') {
          this.generalService.getData(field.data.url).subscribe((res) => {
            var data_val = res[0][field.data.key];

            this.model[field.name] = data_val;
          });
          // var api_val = this.getEntityData(field.data.url);
          // var data_val = api_val[0][field.data.key]
        }

        if (field.custom && field.element) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ] = field.element;
          if (field.element.hasOwnProperty('title')) {
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['title'] = this.translate.instant(field.element.title);
          }
          if (field.name != 'prerakName') {
            this.customFields.push(field.name);
          }
          if (field.data && field.data.type == 'api') {
            this.generalService.getData(field.data.url).subscribe((res) => {
              var data_val = res[0][field.data.key];
              this.model[field.name] = data_val;
            });
            // var api_val = this.getEntityData(field.data.url);
            // var data_val = api_val[0][field.data.key]
          }
        } else {
          this.addWidget(fieldset, field, '');
        }

        this.definations[fieldset.definition].properties[field.name] =
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ];

        if (field.children && !field.children.title) {
          if (this.property[field.name].title) {
            delete this.property[field.name].title;
          }
          if (this.property[field.name].description) {
            delete this.property[field.name].description;
          }
        }
      });
    } else {
      let res = this.responseData.definitions[fieldset.definition].properties;
      this.nastedChild(fieldset, fieldset.definition, res);
    }
  }

  removeFields(fieldset) {
    fieldset.except.forEach((field) => {
      delete this.definations[fieldset.definition].properties[field];
    });
  }

  addLockIcon(responseData) {
    if (
      responseData.access == 'private' &&
      responseData.widget.formlyConfig.templateOptions['type'] != 'hidden'
    ) {
      if (!responseData.widget.formlyConfig.templateOptions['addonRight']) {
        responseData.widget.formlyConfig.templateOptions['addonRight'] = {};
      }
      if (!responseData.widget.formlyConfig.templateOptions['attributes']) {
        responseData.widget.formlyConfig.templateOptions['attributes'] = {};
      }
      responseData.widget.formlyConfig.templateOptions['addonRight'] = {
        class: 'private-access',
        text: this.translate.instant('ONLY_BY_CONSENT'),
      };
      responseData.widget.formlyConfig.templateOptions['attributes'] = {
        style: 'width: 100%;',
      };
    } else if (
      responseData.access == 'internal' &&
      responseData.widget.formlyConfig.templateOptions['type'] != 'hidden'
    ) {
      if (!responseData.widget.formlyConfig.templateOptions['addonRight']) {
        responseData.widget.formlyConfig.templateOptions['addonRight'] = {};
      }
      if (!responseData.widget.formlyConfig.templateOptions['attributes']) {
        responseData.widget.formlyConfig.templateOptions['attributes'] = {};
      }
      responseData.widget.formlyConfig.templateOptions['addonRight'] = {
        class: 'internal-access',
        text: this.translate.instant('ONLY_BY_ME'),
      };
      responseData.widget.formlyConfig.templateOptions['attributes'] = {
        style: 'width: 100%;',
      };
    }
  }

  checkString(conStr, title) {
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

  async addWidget(fieldset, field, childrenName) {
    this.translate.get(this.langKey + '.' + field.name).subscribe((res) => {
      let constr = this.langKey + '.' + field.name;
      if (res != constr) {
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ].title = this.generalService.translateString(
          this.langKey + '.' + field.name
        );
      }
    });

    if (field.widget) {
      this.responseData.definitions[fieldset.definition].properties[field.name][
        'widget'
      ] = field.widget;
    } else {
      this.res =
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ];

      if (this.res != undefined && !this.res.hasOwnProperty('properties')) {
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget'] = {
          formlyConfig: {
            templateOptions: {},
            validation: {},
            expressionProperties: {},
            modelOptions: {},
          },
        };

        if (field?.datepickerOptions) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['templateOptions']['datepickerOptions'] =
            {
              datepickerOptions: {
                max: '2022-10-10',
                min: '2022-09-10',
              },
            };
        }
        if (field.title) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['title'] =
          field.title
        }
        if (field.placeholder) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['templateOptions']['placeholder'] =
            this.generalService.translateString(
              this.langKey + '.' + field.placeholder
            );
        }

        if (field.format) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['templateOptions']['type'] = field.format;
        }

        if (field.type === 'geolocation') {
          this.model[field.name] = this.lat + ',' + this.lng;
        }

        if (field.description) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['templateOptions']['description'] =
            this.generalService.translateString(
              this.langKey + '.' + field.description
            );
        }

        if (field.classGroup) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['fieldGroupClassName'] = field.classGroup;
        }
        if (field.expressionProperties) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['expressionProperties'] =
            field.expressionProperties;
        }
        if (field.class) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['className'] = field.class;
        }

        if (
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ].hasOwnProperty('items')
        ) {
          if (
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ].items.hasOwnProperty('properties')
          ) {
            let _self = this;
            Object.keys(
              _self.responseData.definitions[fieldset.definition].properties[
                field.name
              ].items.properties
            ).forEach(function (key) {
              _self.responseData.definitions[fieldset.definition].properties[
                field.name
              ].items.properties[key].title = _self.checkString(
                key,
                _self.responseData.definitions[fieldset.definition].properties[
                  field.name
                ].items.properties[key].title
              );
            });
          }
        }

        if (field.hidden) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['templateOptions']['type'] = 'hidden';
          delete this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['title'];
        }
        if (field.required || field.children) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['templateOptions']['required'] =
            field.required;
        }
        if (field.children) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['templateOptions']['required'] = true;
        }
        if (field.format && field.format === 'file') {
          if (this.type && this.type.includes('property')) {
            localStorage.setItem('property', this.type.split(':')[1]);
          }
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['type'] = field.format;
          if (field.multiple) {
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['templateOptions']['multiple'] =
              field.multiple;
          }
          this.fileFields.push(field.name);
        }

        if (
          this.privacyCheck &&
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['templateOptions']['type'] != 'hidden' &&
          this.privateFields.indexOf('$.' + childrenName) < 0 &&
          this.internalFields.indexOf('$.' + childrenName) < 0
        ) {
          if (this.privateFields.length || this.internalFields.length) {
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['templateOptions'] = {
              addonRight: {
                class: 'public-access',
                text: this.translate.instant('ANYONE'),
              },
              attributes: {
                style: 'width: 90%; ',
              },
            };
          }
        }
        // if (field.type === 'date') {
        //   this.responseData.definitions[fieldset.definition].properties[field.name]['widget']['formlyConfig']['validators'] = {
        //     validation: ['date-future'],
        //   }
        // }

        if (field.validation) {
          if (field.validation.message) {
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['validation'] = {
              messages: {
                pattern: field.validation.message,
              },
            };
            if (field.validation.pattern) {
              this.responseData.definitions[fieldset.definition].properties[
                field.name
              ]['pattern'] = field.validation.pattern;
            }
          }
          if (field.validation.lessThan || field.validation.greaterThan || field.validation.maxYear || field.validation.minYear) {
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['modelOptions'] = {
              updateOn: 'blur',
            };
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['asyncValidators'] = {};
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['asyncValidators'][field.name] = {};
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['asyncValidators'][field.name][
              'expression'
            ] = (control: FormControl) => {
              if (control.value != null) {
                if (field.type === 'date') {

                  if (this.model[field.validation.lessThan]) {
                    if (
                      new Date(
                        this.model[field.validation.lessThan]
                      ).valueOf() > new Date(control.value).valueOf()
                    ) {
                      return of(control.value);
                    } else {
                      return of(false);
                    }
                  } else if (this.model[field.validation.greaterThan]) {
                    if (
                      new Date(
                        this.model[field.validation.greaterThan]
                      ).valueOf() < new Date(control.value).valueOf()
                    ) {
                      return of(control.value);
                    } else {
                      return of(false);
                    }
                  } else if (field.validation.maxYear && field.validation.minYear) {
                    if (
                      new Date(control.value).valueOf() >
                      new Date(new Date().getFullYear() - field.validation.maxYear, new Date().getMonth(), new Date().getDate()).valueOf()
                      &&  new Date(control.value).valueOf() <
                      new Date(new Date().getFullYear() - field.validation.minYear, new Date().getMonth(), new Date().getDate()).valueOf()
                    ) {
                      return of(control.value);
                    } else {
                      return of(false);
                    }
                  }
                  // else if (field.validation.minYear) {
                  //   if (
                  //     new Date(control.value).valueOf() <
                  //     new Date(new Date().getFullYear() + field.validation.minYear, new Date().getMonth(), new Date().getDate()).valueOf()
                  //   ) {
                  //     return of(control.value);
                  //   } else {
                  //     return of(false);
                  //   }
                  // }
                } else {
                  if (this.model[field.validation.lessThan]) {
                    if (this.model[field.validation.lessThan] > control.value) {
                      return of(control.value);
                    } else {
                      return of(false);
                    }
                  } else if (this.model[field.validation.greaterThan]) {
                    if (
                      this.model[field.validation.greaterThan] < control.value
                    ) {
                      return of(control.value);
                    } else {
                      return of(false);
                    }
                  } else {
                    return of(false);
                  }
                }
              }
              return new Promise((resolve, reject) => {
                setTimeout(() => {
                  resolve(true);
                }, 1000);
              });
            };
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['asyncValidators'][field.name][
              'message'
            ] = field.validation.message;
          }
        }
      }
      if (field.autofill) {
        if (field.autofill.apiURL) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['modelOptions'] = {
            updateOn: 'blur',
          };
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['asyncValidators'] = {};
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['asyncValidators'][field.name] = {};
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['asyncValidators'][field.name][
            'expression'
          ] = (control: FormControl) => {
            if (control.value != null) {
              if (field.autofill.method === 'GET') {
                var apiurl = field.autofill.apiURL.replace(
                  '{{value}}',
                  control.value
                );
                this.generalService.getPrefillData(apiurl).subscribe((res) => {
                  if (field.autofill.fields) {
                    field.autofill.fields.forEach((element) => {
                      for (var [key1, value1] of Object.entries(element)) {
                        this.createPath(
                          this.model,
                          key1,
                          this.ObjectbyString(res, value1)
                        );
                        this.form2
                          .get(key1)
                          .setValue(this.ObjectbyString(res, value1));
                      }
                    });
                  }
                  if (field.autofill.dropdowns) {
                    field.autofill.dropdowns.forEach((element) => {
                      for (var [key1, value1] of Object.entries(element)) {
                        if (Array.isArray(res)) {
                          res = res[0];
                        }
                        this.schema['properties'][key1]['items']['enum'] =
                          this.ObjectbyString(res, value1);
                      }
                    });
                  }
                });
              } else if (field.autofill.method === 'POST') {
                var datapath = this.findPath(
                  field.autofill.body,
                  '{{value}}',
                  ''
                );
                if (datapath) {
                  var dataobject = this.setPathValue(
                    field.autofill.body,
                    datapath,
                    control.value
                  );
                  this.generalService
                    .postPrefillData(field.autofill.apiURL, dataobject)
                    .subscribe((res) => {
                      if (Array.isArray(res)) {
                        res = res[0];
                      }
                      if (field.autofill.fields) {
                        field.autofill.fields.forEach((element) => {
                          for (var [key1, value1] of Object.entries(element)) {
                            this.createPath(
                              this.model,
                              key1,
                              this.ObjectbyString(res, value1)
                            );
                            this.form2
                              .get(key1)
                              .setValue(this.ObjectbyString(res, value1));
                          }
                        });
                      }
                      if (field.autofill.dropdowns) {
                        field.autofill.dropdowns.forEach((element) => {
                          for (var [key1, value1] of Object.entries(element)) {
                            this.schema['properties'][key1]['items']['enum'] =
                              this.ObjectbyString(res, value1);
                          }
                        });
                      }
                    });
                }
              }
            }
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                resolve(true);
              }, 1000);
            });
          };
        }
      }

      if (field.dependent) {
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['type'] = 'select';
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['key'] = field.dependent.key;
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['templateOptions'] = {
          label: 'District',
          options: this.locationService.getDistrict(),
        };
      }

      if (field.enum) {
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['items']['properties']['document']['enum'] = field.enum
      }

      if (field.dependentOn) {
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['type'] = 'select';
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['key'] = field.dependentOn.key;
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['templateOptions'] = {
          label: field.dependentOn.title,
          options: [],
        };

        if (field.dependentOn.key == 'block') {
          this.model[childrenName] = {
            district: null,
            block: null,
          };

          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['hooks'] = {
            onInit: (field1: FormlyFieldConfig) => {
              field1.templateOptions.options = field1.form
                .get('district')
                .valueChanges.pipe(
                  startWith(this.model[childrenName]['district']),
                  switchMap((district) =>
                    this.locationService.getBlock(
                      this.model[childrenName]['district']
                    )
                  )
                );
            },
          };
        } else {
          this.model[childrenName] = {
            block: null,
            village: null,
          };

          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['hooks'] = {
            onInit: (field1: FormlyFieldConfig) => {
              field1.templateOptions.options = field1.form
                .get('block')
                .valueChanges.pipe(
                  startWith(this.model[childrenName]['block']),
                  switchMap((district) =>
                    this.locationService.getVillege(
                      this.model[childrenName]['block']
                    )
                  )
                );
            },
          };
        }
      }

      if (field.autocomplete) {
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['type'] = 'autocomplete';
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['templateOptions']['placeholder'] =
          this.generalService.translateString(
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['title']
          );
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['templateOptions']['label'] =
          field.autocomplete.responseKey;
        var dataval = '{{value}}';
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['templateOptions']['search$'] = (term) => {
          if (term || term != '') {
            var datapath = this.findPath(field.autocomplete.body, dataval, '');
            this.setPathValue(field.autocomplete.body, datapath, term);

            dataval = term;
            this.generalService
              .postData(field.autocomplete.apiURL, field.autocomplete.body)
              .subscribe(async (res) => {
                let items = res;
                items = items.filter(
                  (x) =>
                    x[field.autocomplete.responseKey]
                      .toLocaleLowerCase()
                      .indexOf(term.toLocaleLowerCase()) > -1
                );
                if (items) {
                  this.searchResult = items;
                  return observableOf(this.searchResult);
                }
              });
          }
          return observableOf(this.searchResult);
        };
      }

      if(field?.name == "examChoice"){
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'] = {};
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'][field.name] = {};
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'][field.name][
          'expression'
        ] = (control: FormControl) => {
          if (control.value != null) {
            if(this.subjectsLoaded){
                this.model['subjects'] = [];
                // this.loadSchema();
            }
            if (
              isRSOS_NSOS_First(control.value)
            ) {
              if(this.model['subjects']){

                if (this.model['subjects'].length <= 7 && this.model['subjects'].length >= 5) {
                  this.errMsg = null;
                  return of(control.value);
                }else{

                  this.errMsg ='You need to select Minimum 5 subjects and Maximum 7 subjects';
                  // return of(false);
                }
              }

            } else if(isRSOS_NSOS_Last(control.value)) {
              if(this.model['subjects']){

                if (this.model['subjects'].length <= 7 && this.model['subjects'].length >= 1) {
                  this.errMsg = null;
                  return of(control.value);
                }else{

                   this.errMsg ='You need to select Minimum 1 subjects and Maximum 7 subjects';
                  //  return of(false);
                }
              }
            } else{
              this.errMsg = null;
            }

          }
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve(true);
            }, 1000);
          });
        };
      }

      if (field.type) {
        if (field.type === 'multiselect') {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['type'] = field.type;
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['templateOptions']['multiple'] = true;
          if (field.required) {
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['templateOptions']['placeholder'] =
              field.title + '*';
          } else {
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['templateOptions']['placeholder'] =
              field.title;
          }

          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['templateOptions']['options'] = [];
          try {
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['items']['enum'].forEach((enumval) => {
              this.responseData.definitions[fieldset.definition].properties[
                field.name
              ]['widget']['formlyConfig']['templateOptions']['options'].push({
                label: enumval,
                value: enumval,
              });
            });
          } catch (err) {
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['enum'].forEach((enumval) => {
              this.responseData.definitions[fieldset.definition].properties[
                field.name
              ]['widget']['formlyConfig']['templateOptions']['options'].push({
                label: enumval,
                value: enumval,
              });
            });
          }
          if (
            field?.validation &&
            field?.validation?.max &&
            field?.validation?.min
          ) {
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['asyncValidators'] = {};
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['asyncValidators'][field.name] = {};
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['asyncValidators'][field.name][
              'expression'
            ] = (control: FormControl) => {
              if (control.value != null) {
                if (
                  this.model['examChoice'] == RSOS_PehlaPrayas ||
                  this.model['examChoice'] == NSOS_PehlaPrayas
                ) {
                  this.responseData.definitions[fieldset.definition].properties[
                    field.name
                  ]['widget']['formlyConfig']['asyncValidators'][field.name][
                    'message'
                  ] =
                    'You need to select Minimum 5 values and Maximum 7 values';
                  if (control.value.length <= 7 && control.value.length >= 5) {
                    this.errMsg = null;
                    return of(control.value);
                  } else {
                    this.errMsg = 'You need to select Minimum 5 values and Maximum 7 values';
                    this.generalService.debugLog("subject - Minimum 5 values and Maximum 7 values");
                    return of(false);
                  }
                } else if(this.model['examChoice'] == RSOS_PurakPrayas ||
                this.model['examChoice'] == NSOS_PurakPrayas) {
                  this.responseData.definitions[fieldset.definition].properties[
                    field.name
                  ]['widget']['formlyConfig']['asyncValidators'][field.name][
                    'message'
                  ] =
                    'You need to select Minimum ' +
                    field.validation.min +
                    ' values and Maximum ' +
                    field.validation.max +
                    ' values';
                  if (
                    control.value.length <= 7 && control.value.length >= 1
                  ) {
                    this.errMsg = null;
                    return of(control.value);
                  } else {
                    // this.errMsg = 'You need to select Minimum ' +
                    // field.validation.min +
                    // ' values and Maximum ' +
                    // field.validation.max +
                    // ' values';
                    this.generalService.debugLog("Minimum 1 values and Maximum 7 values");
                    return of(false);
                  }
                }
              }
              return new Promise((resolve, reject) => {
                setTimeout(() => {
                  resolve(true);
                }, 1000);
              });
            };
          }
        } else if (field.type == 'custom:document') {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['modelOptions'] = {
            updateOn: 'blur',
          };
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['asyncValidators'] = {};
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['asyncValidators'][field.name] = {};
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['asyncValidators'][field.name][
            'expression'
          ] = (control: FormControl) => {
            if (control.value != null) {
              // if (field?.validation && field?.validation?.future == false) {
              if (control.value[0]['document'] != null) {
                return of(control.value);
              } else {
                this.responseData.definitions[fieldset.definition].properties[
                  field.name
                ]['widget']['formlyConfig']['asyncValidators'][field.name][
                  'message'
                ] = 'You should need to select atlease one document.';
                return of(false);
              }
              // }
            }
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                resolve(true);
              }, 1000);
            });
          };
        } else if (field.type === 'date') {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['templateOptions']['type'] = 'date';
          if (
            (field.validation && field.validation.future == false) ||
            field?.validation?.max
          ) {
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['modelOptions'] = {
              updateOn: 'blur',
            };
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['asyncValidators'] = {};
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['asyncValidators'][field.name] = {};
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]['widget']['formlyConfig']['asyncValidators'][field.name][
              'expression'
            ] = (control: FormControl) => {
              if (control.value != null) {
                if (field?.validation && field?.validation?.max) {
                  var d = new Date(field?.validation?.max);
                  if (new Date(control.value) < d) {
                    return of(control.value);
                  } else {
                    this.responseData.definitions[
                      fieldset.definition
                    ].properties[field.name]['widget']['formlyConfig'][
                      'asyncValidators'
                    ][field.name]['message'] = field?.validation?.message;
                    return of(false);
                  }
                }
                if (field?.validation && field?.validation?.future == false) {
                  if (new Date(control.value).valueOf() < Date.now()) {
                    return of(control.value);
                  } else {
                    this.responseData.definitions[
                      fieldset.definition
                    ].properties[field.name]['widget']['formlyConfig'][
                      'asyncValidators'
                    ][field.name]['message'] = this.translate.instant(
                      'AADHAR_TAKEN'
                    );
                    return of(false);
                  }
                }
              }
              return new Promise((resolve, reject) => {
                setTimeout(() => {
                  resolve(true);
                }, 1000);
              });
            };
          }
        } else {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ]['widget']['formlyConfig']['templateOptions']['type'] = field.type;
        }
      }
      if (field.disabled || field.disable) {
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['templateOptions']['disabled'] =
          field.disabled;
      }
      if (field.defaultValue) {
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['defaultValue'] =
        field.defaultValue;
      }

      if (field.name == 'whereStudiedLast') {
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'] = {};
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'][field.name] = {};

        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'][field.name][
          'expression'
        ] = (control: FormControl) => {
          if (control.value != null) {
            // this.model['AGDocumentsV3'] = [];
            if (control.value == 'प्राइवेट स्कूल') {
              this.responseData.definitions[fieldset.definition].properties[
                'AGDocumentsV3'
              ]['items']['properties']['document']['enum'] = privateSchoolEnums;
              return of(control.value);
            } else if (control.value == 'सरकारी स्कूल') {
              this.responseData.definitions[fieldset.definition].properties[
                'AGDocumentsV3'
              ]['items']['properties']['document']['enum'] = sarkariSchoolEnums;
              return of(control.value);
            } else if (control.value == 'कभी पढ़ाई नहीं की') {
              this.responseData.definitions[fieldset.definition].properties[
                'AGDocumentsV3'
              ]['items']['properties']['document']['enum'] = noSchoolEnums;
              return of(control.value);
            }

          }
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve(true);
            }, 2000);
          });
        };
      }


      if (field.name == 'AGDocumentsV3') {
        // if(!this.model['whereStudiedLast']){
        //   this.responseData.definitions[fieldset.definition].properties[
        //     'AGDocumentsV3'
        //   ]['items']['properties']['document']['enum'] = privateSchoolEnums;
        // }
        // if (this.model['whereStudiedLast'] == 'प्राइवेट स्कूल') {
        //   this.responseData.definitions[fieldset.definition].properties[
        //     'AGDocumentsV3'
        //   ]['items']['properties']['document']['enum'] = privateSchoolEnums;

        // } else if (this.model['whereStudiedLast'] == 'सरकारी स्कूल') {
        //   this.responseData.definitions[fieldset.definition].properties[
        //     'AGDocumentsV3'
        //   ]['items']['properties']['document']['enum'] = sarkariSchoolEnums;

        // } else if (this.model['whereStudiedLast'] == 'कभी पढ़ाई नहीं की') {
        //   this.responseData.definitions[fieldset.definition].properties[
        //     'AGDocumentsV3'
        //   ]['items']['properties']['document']['enum'] = noSchoolEnums;

        // }
        // else{
        //   var all_docs = privateSchoolEnums.concat(sarkariSchoolEnums);
        //   this.responseData.definitions[fieldset.definition].properties[
        //     'AGDocumentsV3'
        //   ]['items']['properties']['document']['enum'] = all_docs;
        // }
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'] = {};
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'][field.name] = {};

        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'][field.name][
          'expression'
        ] = (control: FormControl) => {
          if (control.value != null) {
            var enumList = [];
            if(this.model['whereStudiedLast']){
              if (this.model['whereStudiedLast'] == 'प्राइवेट स्कूल') {
                enumList = privateSchoolEnums;
              } else if (this.model['whereStudiedLast'] == 'सरकारी स्कूल') {
                enumList = sarkariSchoolEnums;
              } else if (this.model['whereStudiedLast'] == 'कभी पढ़ाई नहीं की') {
                enumList = noSchoolEnums;
              }
              control.value.forEach(doc_ele => {
                enumList = enumList.filter(e => e !== doc_ele.document);
              });
            }

          }
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve(true);
            }, 2000);
          });
        };
      }

      if (field.name == 'sameAsAbove') {
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'] = {};
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'][field.name] = {};

        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'][field.name][
          'expression'
        ] = (control: FormControl) => {
          if (control.value != null) {
            // if (
            //   control.value == 'सरकारी स्कूल') {
            //   this.responseData.definitions[fieldset.definition].properties["AGDocumentsV3"]["items"]["properties"]["document"]["enum"] = [
            //     "टीसी",
            //     "मार्कशीट",
            //     "आधार कार्ड",
            //     "2 फोटो",
            //     "जनाधार कार्ड",
            //     "किशोरी का बैंक पासबुक (स्वयं या संयुक्त खाता)",
            //     "मोबाइल नंबर",
            //     "ईमेल आईडी"
            //   ]
            //   return of(control.value);
            // }
          }
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve(true);
            }, 2000);
          });
        };
      }

      if (field.name == 'aadharNumber') {
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'] = {};
        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'][field.name] = {};

        this.responseData.definitions[fieldset.definition].properties[
          field.name
        ]['widget']['formlyConfig']['asyncValidators'][field.name][
          'expression'
        ] = async (control: FormControl) => {
          if (control.value != null) {
            await this.generalService
            .postData('AGV8/search', {
              filters: {
                aadharNumber: {
                  eq: control.value,
                },
              },
            })
            .subscribe((res) => {
              if (res.length == 0) {
                this.responseData.definitions[
                  fieldset.definition
                ].properties[field.name]['widget']['formlyConfig'][
                  'asyncValidators'
                ][field.name]['message'] = this.translate.instant(
                  'DATE_MUST_BIGGER_TO_TODAY_DATE'
                );
                return of(false);
              }
              else{
                return of(control.value);
              }

            });

          }
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve(true);
            }, 2000);
          });
        };
      }

      if (
        this.privateFields.indexOf('$.' + childrenName) < 0 ||
        this.internalFields.indexOf('$.' + childrenName) < 0
      ) {
        let temp_access_field = '$.' + childrenName + '.' + field.name;

        if (
          this.privateFields.includes(temp_access_field) &&
          this.privateFields.indexOf('$.' + childrenName) < 0
        ) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ].access = 'private';
          this.addLockIcon(
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]
          );
        } else if (
          this.internalFields.includes(temp_access_field) &&
          this.internalFields.indexOf('$.' + childrenName) < 0
        ) {
          this.responseData.definitions[fieldset.definition].properties[
            field.name
          ].access = 'internal';
          this.addLockIcon(
            this.responseData.definitions[fieldset.definition].properties[
              field.name
            ]
          );
        }
      }
    }
  }


  addChildWidget(field, ParentName, childrenName) {
    this.res =
      this.responseData.definitions[
        ParentName.replace(/^./, ParentName[0].toUpperCase())
      ].properties[childrenName];
    this.res.properties[field.name].title = this.checkString(
      field.name,
      this.res.properties[field.name].title
    );
    if (field.widget) {
      this.res.properties[field.name]['widget'] = field.widget;
    } else {
      this.res.properties[field.name]['widget'] = {
        formlyConfig: {
          templateOptions: {},
          validation: {},
          expressionProperties: {},
        },
      };

      if (
        this.privacyCheck &&
        this.privateFields.indexOf('$.' + ParentName) < 0 &&
        this.internalFields.indexOf('$.' + ParentName) < 0
      ) {
        if (
          !this.res.properties[field.name]['widget']['formlyConfig'][
            'templateOptions'
          ]['addonRight']
        ) {
          this.res.properties[field.name]['widget']['formlyConfig'][
            'templateOptions'
          ]['addonRight'] = {};
        }
        if (
          !this.res.properties[field.name]['widget']['formlyConfig'][
            'templateOptions'
          ]['attributes']
        ) {
          this.res.properties[field.name]['widget']['formlyConfig'][
            'templateOptions'
          ]['attributes'] = {};
        }
        this.res.properties[field.name]['widget']['formlyConfig'][
          'templateOptions'
        ]['addonRight'] = {
          class: 'public-access',
          text: this.translate.instant('ANYONE'),
        };
        this.res.properties[field.name]['widget']['formlyConfig'][
          'templateOptions'
        ]['attributes'] = {
          style: 'width: 90%;',
        };
      }

      if (field.disabled || field.disable) {
        this.res.properties[field.name]['widget']['formlyConfig'][
          'templateOptions'
        ]['disabled'] = field.disabled;
      }

      let temp_access_field =
        '$.' + ParentName + '.' + childrenName + '.' + field.name;

      if (
        this.privateFields.indexOf('$.' + ParentName) < 0 ||
        this.privateFields.indexOf('$.' + ParentName) < 0
      ) {
        if (this.privateFields.includes(temp_access_field)) {
          this.res.properties[field.name].access = 'private';
          this.addLockIcon(this.res.properties[field.name]);
        } else if (this.internalFields.includes(temp_access_field)) {
          this.res.properties[field.name].access = 'internal';
          this.addLockIcon(this.res.properties[field.name]);
        }
      }

      this.responseData.definitions[
        ParentName.replace(/^./, ParentName[0].toUpperCase())
      ].properties[childrenName] = this.res;
    }
  }

  async submit() {
    if (localStorage.getItem('isAdminAdd')) {
      this.identifier = null;
    }

    if (localStorage.getItem('isAGAdd')) {
      this.identifier = null;
    }

    this.isSubmitForm = true;
    if (this.model['sameAsAbove']) {
      this.model['parentsWhatsappNumber'] = this.model['parentsMobileNumber'];
    }
    // if(this.model['subjects']){
    //   delete this.model['subjects'];
    // }
    if (property == 'AgRegistrationForm') {
      if (this.model['AgAddress']) {
        delete this.model['AgAddress'];
      }
    }
    if (this.model['isRSOS_NIOSFormSubmitted'] == 'नहीं') {
      // alert('here');
      this.model = {};
      this.model['isRSOS_NIOSFormSubmitted'] = 'नहीं';
      this.model['isRSOS_NIOSRegIdReceived'] = 'नहीं';
      this.model['RSOS_NIOSRegId'] = '';
      this.model['subjects'] = ["NA"];
      this.model['examChoice'] = 'NA';
      this.model['birthDateOnRSOS_NIOSForm'] = (new Date()).toISOString().split('T')[0];
    }

    if (this.model['RSOS_NIOSRegId'] == null) {
      this.model['RSOS_NIOSRegId'] = "";
    }

    if (this.model['RSOS_NIOSFormPhoto']) {
      delete this.model['RSOS_NIOSFormPhoto'];
    }

    if (this.model['RSOS_NIOSRegId']) {
      this.model['RSOS_NIOSRegId'] = this.model['RSOS_NIOSRegId'].toString();
    }
    if (this.model['AGDocumentsV3'] && this.model['AGDocumentsV3'][0] == null) {
      this.model['AGDocumentsV3'] = [];
    }

    // if (this.model['examChoice']) {
    //   if (
    //     isRSOS_NSOS_First(this.model['examChoice'])
    //   ) {
    //     if(this.model['subjects']){

    //       if (this.model['subjects'].length <= 7 && this.model['subjects'].length >= 5) {
    //         this.errMsg =
    //         'You need to select Minimum 5 subjects and Maximum 7 subjects';
    //       }
    //     }

    //   } else if(isRSOS_NSOS_Last(this.model['examChoice'])) {
    //     if(this.model['subjects']){

    //       if (this.model['subjects'].length <= 7 && this.model['subjects'].length >= 1) {
    //         this.errMsg =
    //         'You need to select Minimum 1 subjects and Maximum 7 subjects';
    //       }
    //     }
    //   }
    // }
    // else{
      if (this.fileFields.length > 0) {
        this.fileFields.forEach((fileField) => {
          if (this.model[fileField]) {
            var formData = new FormData();
            for (let i = 0; i < this.model[fileField].length; i++) {
              const file = this.model[fileField][i];
              formData.append('files', file);
            }

            if (this.type && this.type.includes('property')) {
              var property = this.type.split(':')[1];
            }

            let id = this.entityId ? this.entityId : this.identifier;
            var url = [this.apiUrl, id, property, 'documents'];
            this.generalService.postData(url.join('/'), formData).subscribe(
              (res) => {
                var documents_list: any[] = [];
                var documents_obj = {
                  fileName: '',
                  format: 'file',
                };
                res.documentLocations.forEach((element) => {
                  documents_obj.fileName = element;
                  documents_list.push(documents_obj);
                });

                this.model[fileField] = documents_list;
                if (this.type && this.type === 'entity') {
                  if (this.identifier != null) {
                    this.updateData();
                  } else {
                    this.postData();
                  }
                } else if (this.type && this.type.includes('property')) {
                  var property = this.type.split(':')[1];
                  var url;
                  if (this.identifier != null && this.entityId != undefined) {
                    url = [this.apiUrl, this.entityId, property, this.identifier];
                  } else {
                    url = [this.apiUrl, this.identifier, property];
                  }
                  if (property == 'AgRegistrationForm') {
                    url = [this.apiUrl, localStorage.getItem('id'), property];
                  }
                  this.apiUrl = url.join('/');
                  if (this.model[property]) {
                    this.model = this.model[property];
                  }

                  this.postData();

                  if (
                    this.model.hasOwnProperty('attest') &&
                    this.model['attest']
                  ) {
                    this.raiseClaim(property);
                  }
                }
              },
              (err) => {
                this.toastMsg.error(
                  'error',
                  this.translate.instant('SOMETHING_WENT_WRONG')
                );
              }
            );
          } else {
            if (this.type && this.type === 'entity') {
              if (this.identifier != null) {
                this.updateData();
              } else {
                this.postData();
              }
            } else if (this.type && this.type.includes('property')) {
              var property = this.type.split(':')[1];
              // let url;
              if (this.identifier != null && this.entityId != undefined) {
                url = [this.apiUrl, this.entityId, property, this.identifier];
              } else {
                url = [this.apiUrl, this.identifier, property];
              }
              if (property == 'AgRegistrationForm') {
                url = [this.apiUrl, localStorage.getItem('id'), property];
                this.entityId = undefined;
              }
              this.apiUrl = url.join('/');
              if (this.model[property]) {
                this.model = this.model[property];
              }
              if (this.identifier != null && this.entityId != undefined) {
                this.updateClaims();
              } else {
                this.postData();
              }

              if (this.model.hasOwnProperty('attest') && this.model['attest']) {
                this.raiseClaim(property);
              }
            }
          }
        });
      } else {
        if (this.type && this.type === 'entity') {
          if (this.identifier != null) {
            this.updateData();
          } else {
            this.postData();
          }
        } else if (this.type && this.type.includes('property')) {
          var property = this.type.split(':')[1];

          if (this.identifier != null && this.entityId != undefined) {
            if (
              this.adminForm == 'prerak-admin-setup' ||
              this.adminForm == 'interview'
            ) {
              var url = [this.apiUrl, this.identifier, property];
            } else if (this.isThisAdminRole) {
              var url = [
                this.apiUrl,
                localStorage.getItem('id'),
                property,
                this.identifier,
              ];
            } else {

              if (this.form == 'ag-registration' ||  this.form == 'ag-setup' || this.form == 'ag-registration-setup') {
                var url = [
                  this.apiUrl,
                  localStorage.getItem('ag-id'),
                  property,
                  this.identifier,
                ];
                if(this.add){
                  url = [
                    this.apiUrl,
                    localStorage.getItem('ag-id'),
                    property
                  ]
                }
              } else {
                var url = [this.apiUrl, this.entityId, property, this.identifier];
              }
            }
          } else {
            if (this.form == 'ag-registration' || this.form == 'ag-registration-setup') {
                url = [
                  this.apiUrl,
                  localStorage.getItem('ag-id'),
                  property
                ]

            }else{
              var url = [this.apiUrl, this.identifier, property];
            }

          }

          this.apiUrl = url.join('/');
          if (this.model[property]) {
            this.model = this.model[property];
          }
          if (this.identifier != null && this.entityId != undefined) {
            if (
              this.adminForm == 'prerak-admin-setup' ||
              this.adminForm == 'interview' ||
              this.form == 'ag-setup' ||
              this.form == 'ag-registration' || this.form == 'ag-registration-setup'
            ) {
              if(this.add){
                this.postData();
              }else {
                this.updateClaims();
              }
            }
          } else {
            this.postData();
          }

          if (this.model.hasOwnProperty('attest') && this.model['attest']) {
            this.raiseClaim(property);
          }
        }
      }
    // }


  }

  async raiseClaim(property) {
    setTimeout(() => {
      this.generalService.getData(this.entityUrl).subscribe((res) => {
        res = res[0] ? res[0] : res;
        this.entityId = res.osid;
        if (res.hasOwnProperty(property)) {
          if (!this.propertyId && !this.sorder) {
            /*  var tempObj = []
              for (let j = 0; j < res[property].length; j++) {
                res[property][j].osUpdatedAt = new Date(res[property][j].osUpdatedAt);
                tempObj.push(res[property][j])
              }

             // tempObj.sort((a, b) => (b.osUpdatedAt) - (a.osUpdatedAt));
              this.propertyId = tempObj[0]["osid"];*/

            res[property].sort((a, b) => b.sorder - a.sorder);
            this.propertyId = res[property][0]['osid'];
          }

          if (this.sorder) {
            var result = res[property].filter((obj) => {
              return obj.sorder === this.sorder;
            });

            this.propertyId = result[0]['osid'];
          }

          var temp = {};
          temp[property] = [this.propertyId];
          let propertyUniqueName =
            this.entityName.toLowerCase() +
            property.charAt(0).toUpperCase() +
            property.slice(1);

          propertyUniqueName =
            this.entityName == 'student' || this.entityName == 'Student'
              ? 'studentInstituteAttest'
              : propertyUniqueName;

          let data = {
            entityName:
              this.entityName.charAt(0).toUpperCase() +
              this.entityName.slice(1),
            entityId: this.entityId,
            name: propertyUniqueName,
            propertiesOSID: temp,
            additionalInput: {
              notes: this.model['notes'],
            },
          };
          this.sentToAttestation(data);
        }
      });
    }, 1000);
  }

  sentToAttestation(data) {
    this.generalService.attestationReq('/send', data).subscribe(
      (res) => {
        if (res.params.status == 'SUCCESSFUL') {
          if (this.form == 'ag-registration' || this.form == 'ag-registration-setup') {
            window.history.go(-1);
            // window.location.reload();
          } else {
            this.router.navigate([this.redirectTo]);
          }
        } else if (
          res.params.errmsg != '' &&
          res.params.status == 'UNSUCCESSFUL'
        ) {
          this.toastMsg.error('error', res.params.errmsg);
          this.isSubmitForm = false;
        }
      },
      (err) => {
        this.toastMsg.error('error', err.error.params.errmsg);
        this.isSubmitForm = false;
      }
    );
  }

  filtersearchResult(term: string) {
    if (term && term != '') {
      var formData = {
        filters: {
          instituteName: {
            contains: term,
          },
        },
        limit: 20,
        offset: 0,
      };
      this.generalService
        .postData('/Institute/search', formData)
        .subscribe(async (res) => {
          let items = res;
          items = await items.filter(
            (x) =>
              x.instituteName
                .toLocaleLowerCase()
                .indexOf(term.toLocaleLowerCase()) > -1
          );
          if (items) {
            return items;
          }
        });
    }
  }

  getNotes() {
    let entity =
      this.entityName.charAt(0).toUpperCase() + this.entityName.slice(1);
    this.generalService.getData(entity).subscribe((res) => {
      res = res[0] ? res[0] : res;

      let propertyUniqueName =
        this.entityName.toLowerCase() +
        this.propertyName.charAt(0).toUpperCase() +
        this.propertyName.slice(1);
      propertyUniqueName =
        this.entityName == 'student' || this.entityName == 'Student'
          ? 'studentInstituteAttest'
          : propertyUniqueName;

      if (res.hasOwnProperty(propertyUniqueName)) {
        let attestionRes = res[propertyUniqueName];

        var tempObj = [];

        for (let j = 0; j < attestionRes.length; j++) {
          if (
            this.propertyId ==
            attestionRes[j].propertiesOSID[this.propertyName][0]
          ) {
            attestionRes[j].propertiesOSID.osUpdatedAt = new Date(
              attestionRes[j].propertiesOSID.osUpdatedAt
            );
            tempObj.push(attestionRes[j]);
          }
        }

        tempObj.sort((a, b) => b.propertiesOSID.osUpdatedAt - a.osUpdatedAt);
        let claimId = tempObj[0]['_osClaimId'];

        if (claimId) {
          this.generalService
            .getData(entity + '/claims/' + claimId)
            .subscribe((res) => {
              this.notes = res.notes;
            });
        }
      }
    });
  }

  getData() {
    var get_url;

    if (this.identifier) {
      if (
        this.adminForm == 'prerak-admin-setup' ||
        this.adminForm == 'interview'
      ) {
        get_url = '/PrerakV2/' + this.identifier;
        console.log('get_url1',get_url)
      } else if (this.form == 'ag-setup') {
        get_url = '/AGV8/' + this.identifier;
        console.log('get_url2',get_url)
      } else {
        get_url = this.propertyName + '/' + this.identifier;
        console.log('get_url3',get_url)
      }
    } else {
      if (this.form == 'ag-setup') {
        get_url = '/AGV8/' + localStorage.getItem('ag-id');
        console.log('get_url2',get_url)}
      else{
        get_url = this.apiUrl;
        console.log('get_url4',get_url,this.form)
      }

    }

    this.generalService.getData(get_url).subscribe(async (res) => {
      console.log(this.propertyName + '/' + this.identifier)
      console.log("get res",res)
      res = res[0] ? res[0] : res;
      if (this.propertyName) {
        this.entityId = res.osid;
      }
      // if (this.form != 'ag-registration') {

      if (!this.add) {
        this.model = res;
      }

      // }

      this.identifier = res.osid;
      if(this.model['whereStudiedLast']){
        console.log("whereStudiedLast",this.model['whereStudiedLast'])
        if (this.model['whereStudiedLast'] == 'प्राइवेट स्कूल') {
          this.responseData.definitions['AGV8'].properties[
            'AGDocumentsV3'
          ]['items']['properties']['document']['enum'] = privateSchoolEnums;

        } else if (this.model['whereStudiedLast'] == 'सरकारी स्कूल') {
          this.responseData.definitions['AGV8'].properties[
            'AGDocumentsV3'
          ]['items']['properties']['document']['enum'] = sarkariSchoolEnums;

        } else if (this.model['whereStudiedLast'] == 'कभी पढ़ाई नहीं की') {
          this.responseData.definitions['AGV8'].properties[
            'AGDocumentsV3'
          ]['items']['properties']['document']['enum'] = noSchoolEnums;

        }
      }
      if (this.model['examChoice']) {
        if (
          isRSOS_NSOS_First(this.model['examChoice'])
        ) {
          if(this.model['subjects']){

            if (this.model['subjects'].length <= 7 && this.model['subjects'].length >= 5) {
              this.errMsg =
              'You need to select Minimum 5 subjects and Maximum 7 subjects';
            }
          }

        } else if(isRSOS_NSOS_Last(this.model['examChoice'])) {
          if(this.model['subjects']){

            if (this.model['subjects'].length <= 7 && this.model['subjects'].length >= 1) {
              this.errMsg =
              'You need to select Minimum 1 subjects and Maximum 7 subjects';
            }
          }
        }
      }
      await this.loadSchema();
      // var intervalId = setInterval(function() {
      //   this.subjectsLoaded = true;
      //   console.log("inside",this.subjectsLoaded)
      //   clearInterval(intervalId);
      // }, 2000);

    });
  }

  async postData() {
    if (Array.isArray(this.model)) {
      this.model = this.model[0];
    }
    this.model['sorder'] = this.exLength;

    if (this.model.hasOwnProperty('address')) {
      if (
        this.model['address'].hasOwnProperty('district') &&
        this.model['address'].block == null
      ) {
        delete this.model['address']['district'];
      }

      if (
        this.model['address'].hasOwnProperty('block') &&
        this.model['address'].block == null
      ) {
        delete this.model['address']['block'];
      }

      if (
        this.model['address'].hasOwnProperty('village') &&
        this.model['address'].block == null
      ) {
        delete this.model['address']['village'];
      }
    }

    if (this.model.hasOwnProperty('confirmAddress')) {
      if (
        this.model['confirmAddress'].hasOwnProperty('district') &&
        this.model['confirmAddress'].district == null
      ) {
        delete this.model['confirmAddress']['district'];
      }

      if (
        this.model['confirmAddress'].hasOwnProperty('block') &&
        this.model['confirmAddress'].block == null
      ) {
        delete this.model['confirmAddress']['block'];
      }

      if (
        this.model['confirmAddress'].hasOwnProperty('village') &&
        this.model['confirmAddress'].village == null
      ) {
        delete this.model['confirmAddress']['village'];
      }
    }

    if (this.adminForm == 'add-prerak-admin-setup' || this.isSignupForm) {
      await this.generalService
        .postData('PrerakV2/search', {
          filters: {
            mobile: {
              eq: this.model['mobile'],
            },
          },
        })
        .subscribe((res) => {
          if (res.length == 0) {
            this.generalService.postData(this.apiUrl, this.model).subscribe(
              (res) => {
                if (
                  res.params.status == 'SUCCESSFUL' &&
                  !this.model['attest']
                ) {
                  if (localStorage.getItem('isAdminAdd')) {
                    localStorage.setItem('isAdminAdd', '');
                    // $('.modal-backdrop').remove()
                    if (this.form == 'ag-registration' || this.form == 'ag-registration-setup') {
                      window.history.go(-1);
                      // window.location.reload();
                    } else {
                      this.router.navigate([this.redirectTo]);
                    }
                    // this.router.navigate(['/myags/attestation/ag/AGV8/']);
                    $('.modal-backdrop').remove(); // removes the grey overlay.
                    // window.history.go(-1)
                    // // window.location.reload();
                  } else {
                    $('.modal-backdrop').remove();
                    if (this.form == 'ag-registration'  || this.form == 'ag-registration-setup') {
                      window.history.go(-1);
                      // window.location.reload();
                    } else {
                      this.router.navigate([this.redirectTo]);
                    }
                    // this.router.navigate(['/myags/attestation/ag/AGV8/']);
                    // window.history.go(-1)
                    // // window.location.reload();
                  }
                  if (localStorage.getItem('isAGAdd')) {
                    localStorage.setItem('isAGAdd', '');

                    // uncomment before push
                    this.router.navigate(['/myags/attestation/ag/AGV8']);
                    $('.modal-backdrop').remove(); // removes the grey overlay.

                    // window.history.go(-1)
                    // // window.location.reload();
                  } else {
                    $('.modal-backdrop').remove();
                    // this.router.navigate(['/myags/attestation/ag/AGV8/']);

                    // window.history.go(-1)
                    // // window.location.reload();
                  }
                } else if (
                  res.params.errmsg != '' &&
                  res.params.status == 'UNSUCCESSFUL'
                ) {
                  this.toastMsg.error('error', res.params.errmsg);
                  this.isSubmitForm = false;
                }
              },
              (err) => {
                this.toastMsg.error('error', err.error.params.errmsg);
                this.isSubmitForm = false;
              }
            );
          } else {
            this.toastMsg.error(
              'error',
              this.translate.instant('DUPLICATE_MOBILE_NUMBER')
            );
          }
          this.isSubmitForm = false;
        });
    } else {
      await this.generalService.postData(this.apiUrl, this.model).subscribe(
        (res) => {
          if (res.params.status == 'SUCCESSFUL' && !this.model['attest']) {
            if (localStorage.getItem('isAdminAdd')) {
              localStorage.setItem('isAdminAdd', '');
              // $('.modal-backdrop').remove()
              if (this.form == 'ag-registration' || this.form == 'ag-registration-setup') {
                window.history.go(-1);
                // window.location.reload();
              } else {
                this.router.navigate([this.redirectTo]);
              }
              // this.router.navigate(['/myags/attestation/ag/AGV8/']);
              $('.modal-backdrop').remove(); // removes the grey overlay.
              // window.history.go(-1)
              // // window.location.reload();
            } else {
              $('.modal-backdrop').remove();
              if (this.form == 'ag-registration' || this.form == 'ag-registration-setup') {
                window.history.go(-1);
                // window.location.reload();
              } else {
                this.router.navigate([this.redirectTo]);
              }
              // this.router.navigate(['/myags/attestation/ag/AGV8/']);
              // window.history.go(-1)
              // // window.location.reload();
            }
            if (localStorage.getItem('isAGAdd')) {
              localStorage.setItem('isAGAdd', '');

              // uncomment before push
              this.router.navigate(['/myags/attestation/ag/AGV8']);
              $('.modal-backdrop').remove(); // removes the grey overlay.

              // window.history.go(-1)
              // // window.location.reload();
            } else {
              $('.modal-backdrop').remove();

              // this.router.navigate(['/myags/attestation/ag/AGV8/']);
              if( this.form == 'ag-registration' || this.form == 'ag-registration-setup'){
                window.history.go(-1)

                // window.location.reload();
              } else {
                this.router.navigate([this.redirectTo]);
              }
              // window.history.go(-1)
              // // window.location.reload();
            }
          } else if (
            res.params.errmsg != '' &&
            res.params.status == 'UNSUCCESSFUL'
          ) {
            this.toastMsg.error('error', res.params.errmsg);
            this.isSubmitForm = false;
          }
        },
        (err) => {
          this.toastMsg.error('error', err.error.params.errmsg);
          this.isSubmitForm = false;
        }
      );
    }
  }

  updateData() {
    if (this.model.hasOwnProperty('address')) {
      if (
        this.model['address'].hasOwnProperty('district') &&
        this.model['address'].district == null
      ) {
        delete this.model['address']['district'];
      }

      if (
        this.model['address'].hasOwnProperty('block') &&
        this.model['address'].block == null
      ) {
        delete this.model['address']['block'];
      }

      if (
        this.model['address'].hasOwnProperty('village') &&
        this.model['address'].village == null
      ) {
        delete this.model['address']['village'];
      }
    }

    if (this.model.hasOwnProperty('confirmAddress')) {
      if (
        this.model['confirmAddress'].hasOwnProperty('district') &&
        this.model['confirmAddress'].district == null
      ) {
        delete this.model['confirmAddress']['district'];
      }

      if (
        this.model['confirmAddress'].hasOwnProperty('block') &&
        this.model['confirmAddress'].block == null
      ) {
        delete this.model['confirmAddress']['block'];
      }

      if (
        this.model['confirmAddress'].hasOwnProperty('village') &&
        this.model['confirmAddress'].village == null
      ) {
        delete this.model['confirmAddress']['village'];
      }
    }

    this.generalService
      .putData(this.apiUrl, this.identifier, this.model)
      .subscribe(
        (res) => {
          if (res.params.status == 'SUCCESSFUL' && !this.model['attest']) {
            if (this.form == 'ag-registration' || this.form == 'ag-registration-setup') {
              window.history.go(-1);
              // window.location.reload();
            } else {
              this.router.navigate([this.redirectTo]);
            }
          } else if (
            res.params.errmsg != '' &&
            res.params.status == 'UNSUCCESSFUL'
          ) {
            this.toastMsg.error('error', res.params.errmsg);
            this.isSubmitForm = false;
          }
        },
        (err) => {
          this.toastMsg.error('error', err.error.params.errmsg);
          this.isSubmitForm = false;
        }
      );
  }

  ObjectbyString = function (o, s) {
    s = s.replace(/\[(\w+)\]/g, '.$1');
    s = s.replace(/^\./, '');
    var a = s.split('.');
    for (var i = 0, n = a.length; i < n; ++i) {
      var k = a[i];
      if (k in o) {
        o = o[k];
      } else {
        return;
      }
    }
    return o;
  };

  createPath = (obj, path, value = null) => {
    path = typeof path === 'string' ? path.split('.') : path;
    let current = obj;
    while (path.length > 1) {
      const [head, ...tail] = path;
      path = tail;
      if (current[head] === undefined) {
        current[head] = {};
      }
      current = current[head];
    }
    current[path[0]] = value;
    return obj;
  };

  findPath = (obj, value, path) => {
    if (typeof obj !== 'object') {
      return false;
    }
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var t = path;
        var v = obj[key];
        var newPath = path ? path.slice() : [];
        newPath.push(key);
        if (v === value) {
          return newPath;
        } else if (typeof v !== 'object') {
          newPath = t;
        }
        var res = this.findPath(v, value, newPath);
        if (res) {
          return res;
        }
      }
    }
    return false;
  };

  setPathValue(obj, path, value) {
    var keys;
    if (typeof path === 'string') {
      keys = path.split('.');
    } else {
      keys = path;
    }
    const propertyName = keys.pop();
    let propertyParent = obj;
    while (keys.length > 0) {
      const key = keys.shift();
      if (!(key in propertyParent)) {
        propertyParent[key] = {};
      }
      propertyParent = propertyParent[key];
    }
    propertyParent[propertyName] = value;
    return obj;
  }

  getEntityData(apiUrl) {
    if (this.identifier !== undefined) {
      this.generalService.getData(apiUrl).subscribe((res) => {
        if (res && res[0][this.propertyName].length) {
          this.entityId = res[0].osid;
          this.exLength = res[0][this.propertyName].length;
        }
      });
    } else {
      this.generalService.getData(apiUrl).subscribe((res) => {
        if (res && res[0][this.propertyName].length) {
          this.exLength = res[0][this.propertyName].length;
        }
      });
    }
  }

  updateClaims() {
    this.sorder = this.model.hasOwnProperty('sorder')
      ? this.model['sorder']
      : '';

    this.generalService.updateclaims(this.apiUrl, this.model).subscribe(
      (res) => {
        if (res.params.status == 'SUCCESSFUL' && !this.model['attest']) {
          if (this.form == 'ag-registration' || this.form == 'ag-registration-setup') {
            window.history.go(-1);
            // window.location.reload();
          } else {
            this.router.navigate([this.redirectTo]);
          }
        } else if (
          res.params.errmsg != '' &&
          res.params.status == 'UNSUCCESSFUL'
        ) {
          this.toastMsg.error('error', res.params.errmsg);
        }
      },
      (err) => {
        this.toastMsg.error('error', err.error.params.errmsg);
      }
    );
  }

  getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position: any) => {
          if (position) {
            this.lat = position.coords.latitude;
            this.lng = position.coords.longitude;
          }
        },
        (error: any) => console.log(error ,"error")
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }
}
function isRSOS_NSOS_First(text) {
  return text == RSOS_PehlaPrayas ||
  text == NSOS_PehlaPrayas;
}

function isRSOS_NSOS_Last(text) {
  return text == RSOS_PurakPrayas ||
  text == NSOS_PurakPrayas;
}

