# Check Render Preview Environment Github Action

This action checks the deployment of [preview environments](https://render.com/docs/preview-environments) featured by [Render](https://render.com/)

## Inputs

### `SERVICE_NAME`

**Required** The name of the Render service to check

### `BRANCH_NAME`

The name of the branch deployed by your Render Blueprint (defaults to `master`)

## Outputs

### `env_url`

The **first** service deployment URL

### `env_status`

- `"success"` if all your services are up
- none otherwise

> This action fails if one service deployment has a `failed` state


## Step ID

You need to define an `id` for this action to be able to read its outputs later.

```yaml
jobs:
  your_job:
    steps:
      - uses: actions/check-render-preview@v1
        id: wait # <= this is mandatory if you wish to read outputs later in the workflow
```

## Environment

### `GITHUB_TOKEN`

**Required** A valid Github Token with permissions to read this repository's [deployments](https://docs.github.com/en/rest/deployments/deployments#list-deployments) and [deployments' statuses](https://docs.github.com/en/rest/deployments/statuses)

> You can find information about how to create a personal access token (PAT) [here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

#### Usage

- [Create a secret in your Repository](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository) named `GITHUB_TOKEN` and paste your PAT in the value section
- Pass the github token as an env variable in your workflow

```yaml
# As a global env variable (if you need it elsewhere in your workflow)
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
# As a local env variable (the recommended way)
jobs:
  your_job:
    steps:
      - uses: actions/check-render-preview@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Example usage

You can use this action outputs in another step or in another job that needs it.

```yaml
jobs:
  your_job:
    steps:
      # Define outputs if you wish to read them in another job
      outputs:
        env_status: ${{ steps.wait.outputs.env_status }}
        env_url: ${{ steps.wait.outputs.env_url }}  
    - uses: actions/check-render-preview@v1
      id: wait
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        SERVICE_NAME: dashboard
    - name: 'Check the Dashboard homepage'
      # Condition this step to the output of the previous step
      if: steps.wait.outputs.env_status == 'success'
      uses: lakuapik/gh-actions-http-status@v1
        with:
          sites: '["${{ steps.wait.outputs.env_url }}"]'
          expected: '[200]'
  your_other_job:
    needs: your_job
    # Run this job only if the deployment of your preview environments is successful
    if: needs.your_job.outputs.env_status == 'success'
```