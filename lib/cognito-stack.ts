import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class CognitoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool
    const pool = new cognito.UserPool(this, 'UserPool', {
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      deletionProtection: false,
      deviceTracking: {
        challengeRequiredOnNewDevice: true,
        deviceOnlyRememberedOnUserPrompt: true
      },
      email: cognito.UserPoolEmail.withCognito(),
      enableSmsRole: false,
      mfa: cognito.Mfa.OFF,
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        phone: false,
        preferredUsername: false,
        username: false
      }
    });

    const poolDomain = new cognito.UserPoolDomain(this, "UserPoolDomain", {
      userPool: pool,
      cognitoDomain: {
        domainPrefix: "drewmcgrath"
      }
    });

    // defines an AWS Lambda resource
    const hello = new lambda.Function(this, 'HelloHandler', {
      runtime: lambda.Runtime.PYTHON_3_9,    // execution environment
      code: lambda.Code.fromAsset('lambda'),  // code loaded from "lambda" directory
      handler: 'hello.hello_handler'                // file is "hello", function is "handler"
    });

    // defines an API Gateway REST API resource backed by our "hello" function.
    const api = new apigw.RestApi(this, 'CognitoEndpoint');

    api.root.addMethod("GET", new apigw.LambdaIntegration(hello));

    const clientReadAttributes = (new cognito.ClientAttributes()).withStandardAttributes({ email: true, emailVerified: true });
    const clientWriteAttributes = (new cognito.ClientAttributes()).withStandardAttributes({ email: true });
    const client = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPoolClientName: "CognitoClient",
      userPool: pool,
      accessTokenValidity: cdk.Duration.minutes(60),
      authFlows: {
        adminUserPassword: true,
        custom: true,
        userPassword: true,
        userSrp: true
      },
      authSessionValidity: cdk.Duration.minutes(3),
      idTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(30),
      enableTokenRevocation: true,
      preventUserExistenceErrors: true,
      readAttributes: clientReadAttributes,
      writeAttributes: clientWriteAttributes,
      generateSecret: true,
      oAuth: {
        callbackUrls: [
          `${api.url}*`
        ],
        flows: {
          authorizationCodeGrant: true
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID]
      }
    });

    pool.addClient(client.userPoolClientName);

    cdk.Tags.of(this).add("Environment", "development")
    cdk.Tags.of(this).add("CleanUp", "true")
  }
}
