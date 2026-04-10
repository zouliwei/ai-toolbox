export interface AIApp {
  name: string;
  nameCn?: string;
  nameTw?: string;
  company: string;
  country: string;
  models: string[];
  outputs: string[];
  type: string;
  linkIntl: string;
  linkCn: string;
}

export interface AICompany {
  name: string;
  nameCn?: string;
  nameTw?: string;
  country: string;
  apps: string[];
  models: string[];
}

export interface AIModel {
  name: string;
  nameCn?: string;
  nameTw?: string;
  company: string;
  country: string;
  apps: string[];
  outputs: string[];
}
