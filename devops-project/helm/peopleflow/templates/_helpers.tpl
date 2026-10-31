{{/* Chart name */}}
{{- define "peopleflow.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Fully qualified app name */}}
{{- define "peopleflow.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/* Common labels */}}
{{- define "peopleflow.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
app.kubernetes.io/part-of: peopleflow-hr
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ (default .Chart.AppVersion .Values.image.tag) | quote }}
{{- end -}}

{{/* Selector labels for the web pods */}}
{{- define "peopleflow.selectorLabels" -}}
app.kubernetes.io/name: {{ include "peopleflow.name" . }}-web
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/* Service account name */}}
{{- define "peopleflow.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "peopleflow.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{/* Images */}}
{{- define "peopleflow.image" -}}
{{- printf "%s:%s" .Values.image.repository (default .Chart.AppVersion .Values.image.tag) -}}
{{- end -}}

{{- define "peopleflow.migrationImage" -}}
{{- printf "%s:%s" .Values.migration.image.repository (default (default .Chart.AppVersion .Values.image.tag) .Values.migration.image.tag) -}}
{{- end -}}

{{/* Pod labels that switch on Azure Workload Identity */}}
{{- define "peopleflow.workloadIdentityLabel" -}}
{{- if .Values.serviceAccount.workloadIdentityClientId }}
azure.workload.identity/use: "true"
{{- end }}
{{- end -}}

{{/* CSI volume that syncs Key Vault secrets into the Kubernetes Secret */}}
{{- define "peopleflow.kvVolume" -}}
{{- if .Values.secrets.keyVault.enabled }}
- name: keyvault
  csi:
    driver: secrets-store.csi.k8s.io
    readOnly: true
    volumeAttributes:
      secretProviderClass: {{ include "peopleflow.fullname" . }}-kv
{{- end }}
{{- end -}}

{{- define "peopleflow.kvVolumeMount" -}}
{{- if .Values.secrets.keyVault.enabled }}
- name: keyvault
  mountPath: /mnt/secrets
  readOnly: true
{{- end }}
{{- end -}}
