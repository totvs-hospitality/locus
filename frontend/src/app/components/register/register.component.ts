import {Component, OnInit, ViewChild} from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { RegisterService } from '../../services/register.service';
import { LocalStorageService } from '../../services/local-storage.service';
import {
  PoModalAction,
  PoModalComponent,
  PoNotificationService,
  PoRadioGroupOption,
  PoToasterOrientation
} from '@po-ui/ng-components';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  @ViewChild(PoModalComponent, { static: true }) poModal: PoModalComponent;

  public primaryAction: PoModalAction = {
    label: this.translateService.instant('Submit'),
    action: () => {
      if (this.registerForm.valid) {
        this.saveRegister(this.registerForm);
        this.poModal.close();
      }
    }
  };

  public secondaryAction: PoModalAction = {
    label: this.translateService.instant('Cancel'),
    action: () => this.poModal.close()
  };

  public registerForm: FormGroup;

  //TODO: Verificar pq não está traduzindo
  public options: PoRadioGroupOption[] = [
    { label: this.translateService.instant('Check in'), value: 'checkin' },
    { label: this.translateService.instant('Checkout'), value: 'checkout' }
  ];

  constructor(
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private registerService: RegisterService,
    private translateService: TranslateService,
    private storageService: LocalStorageService,
    private poNotificationService: PoNotificationService,
  ) { }

  ngOnInit() {
    this.registerForm = this.formBuilder.group( {
      name: ['', Validators.required],
      email: ['', Validators.required],
      phone: ['', Validators.required],
      type: ['', Validators.required],
      code: [''],
      checkin: ['']
    });

    this.fetchForm();
  }

  public setName(event) {
    const at = event.indexOf('@');
    const domain = event.substring(at);

    if (domain === '@totvs.com.br' && !this.registerForm.value.name) {
      const emailName = event.substring(0, at);
      const capitalize = emailName.split('.').map(w => w.substring(0, 1).toUpperCase() + w.substring(1)).join(' ');
      this.registerForm.patchValue({
        name: capitalize
      });
    }

  }

  public submit({value, valid}: {value: any, valid: boolean}) {
    if (!valid) {
      this.markFormAsDirty(this.registerForm);

      return this.poNotificationService.warning({
        message: this.translateService.instant('Verify the required fields'),
        orientation: PoToasterOrientation.Top,
      });
    }

    if (value.type === 'checkout') {
      this.verifyActiveCheckIn(value);
      return;
    }

    this.saveRegister(this.registerForm);
  }

  private fetchForm() {
    const { code } = this.route.snapshot.queryParams;
    const register = this.storageService.getInStorage();
    if (register !== null) {
      this.registerForm.patchValue(register);
    }

    if (code) {
      this.registerForm.patchValue({ code });
    }
  }

  private saveRegister({value}: {value: any}) {
    this.storageService.setInStorage(
      { name: value.name, email: value.email, phone: value.phone }
    );
    this.registerService.register(value).subscribe(
      () => {
        this.registerForm.markAsPristine();
        return this.poNotificationService.success({
          message: this.translateService.instant('Registration successful'),
          orientation: PoToasterOrientation.Top,
        });
      },
      (error) => {
        console.error(error);
        return this.poNotificationService.error({
          message: this.translateService.instant('Sorry! An unexpected error occurred, please try again!'),
          orientation: PoToasterOrientation.Top,
        });
      }
    );
  }

  private verifyActiveCheckIn(value) {
    this.registerService.verifyActiveCheckin(value.email).subscribe((data: any[]) => {
      if (data.length === 0) {
        this.poModal.open();
      } else {
        this.saveRegister(this.registerForm);
      }
    });
  }

  private markFormAsDirty(form: FormGroup) {
    Object.keys(form.controls).forEach(key => {
      this.markControlAsDirty(form.controls[key]);
    });
  }

  private markControlAsDirty(control: AbstractControl) {
    control.markAsDirty();

    if (control instanceof FormGroup) {
      this.markFormAsDirty(control);
    } else if (control instanceof FormArray) {
      control.controls.forEach(element => this.markControlAsDirty(element));
    }
  }
}
