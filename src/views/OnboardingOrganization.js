import { Box, Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';

import theme from '../styles/theme';
import { DASHBOARD_PATH } from '~/routes';

import AvatarUploader from '~/components/AvatarUploader';
import BackgroundCurved from '~/components/BackgroundCurved';
import CheckboxPrivacy from '~/components/CheckboxPrivacy';
import CheckboxTerms from '~/components/CheckboxTerms';
import OnboardingStepper from '~/components/OnboardingStepper';
import TransferCirclesInput from '~/components/TransferCirclesInput';
import TransferInfoBalanceCard from '~/components/TransferInfoBalanceCard';
import TutorialOrganization from '~/components/TutorialOrganization';
import VerifiedEmailInput from '~/components/VerifiedEmailInput';
import VerifiedUsernameInput from '~/components/VerifiedUsernameInput';
import { useUpdateLoop } from '~/hooks/update';
import translate from '~/services/locale';
import { validateAmount } from '~/services/token';
import web3 from '~/services/web3';
import notify, { NotificationsTypes } from '~/store/notifications/actions';
import { createNewOrganization } from '~/store/onboarding/actions';
import { checkCurrentBalance } from '~/store/token/actions';
import {
  ORGANIZATION_TUTORIAL,
  finishTutorial,
} from '~/store/tutorial/actions';
import logError, { formatErrorMessage } from '~/utils/debug';
import { formatCirclesValue } from '~/utils/format';

const OnboardingOrganization = () => {
  const dispatch = useDispatch();
  const [isRedirect, setIsRedirect] = useState(false);
  const { isFinished: isTutorialFinished } = useSelector((state) => {
    return state.tutorial[ORGANIZATION_TUTORIAL];
  });

  const [values, setValues] = useState({
    avatarUrl: '',
    email: '',
    username: '',
    prefundValue: 0,
  });

  // Update available token balance for prefund step. This is required
  // especially for the case when we land on this page directly, not having
  // that data yet.
  useUpdateLoop(async () => {
    await dispatch(checkCurrentBalance());
  });

  const onFinish = async () => {
    try {
      await dispatch(
        createNewOrganization(
          values.username,
          values.email,
          values.avatarUrl,
          values.prefundValue,
        ),
      );

      dispatch(
        notify({
          text: translate('OnboardingOrganization.successOnboardingComplete'),
          type: NotificationsTypes.SUCCESS,
        }),
      );

      setIsRedirect(true);
    } catch (error) {
      logError(error);

      const errorMessage = formatErrorMessage(error);

      dispatch(
        notify({
          text: translate('OnboardingOrganization.errorSignup', {
            errorMessage,
          }),
          type: NotificationsTypes.ERROR,
        }),
      );
    }
  };

  const steps = [
    OrganizationStepEmail,
    OrganizationStepPrefund,
    OrganizationStepUsername,
    OrganizationStepAvatar,
  ];

  const handleTutorialFinish = () => {
    dispatch(finishTutorial(ORGANIZATION_TUTORIAL));
  };

  if (!isTutorialFinished) {
    return <TutorialOrganization onFinishTutorial={handleTutorialFinish} />;
  }

  if (isRedirect) {
    return <Redirect push to={DASHBOARD_PATH} />;
  }

  return (
    <>
      <BackgroundCurved gradient={theme.custom.gradients.orange}>
        <Box mt={4}>
          <OnboardingStepper
            exitPath={DASHBOARD_PATH}
            isHorizontalStepper={true}
            mb={16}
            steps={steps}
            values={values}
            onFinish={onFinish}
            onValuesChange={setValues}
          />
        </Box>
      </BackgroundCurved>
    </>
  );
};

const OrganizationStepUsername = ({ onDisabledChange, values, onChange }) => {
  const useStyles = makeStyles((theme) => ({
    organizationStepUsernameContainer: {
      position: 'relative',
      zIndex: theme.zIndex.layer1,
    },
  }));
  const classes = useStyles();

  const handleChange = (username) => {
    onChange({
      username,
    });
  };

  return (
    <Box className={classes.organizationStepUsernameContainer}>
      <Typography align="center" gutterBottom variant="h2">
        {translate('OnboardingOrganization.headingUsername')}
      </Typography>
      <Box mb={6} mt={4}>
        <VerifiedUsernameInput
          label={translate('OnboardingOrganization.formUsername')}
          value={values.username}
          onChange={handleChange}
          onStatusChange={onDisabledChange}
        />
      </Box>
      <Box mb={4}>
        <Typography mb={18}>
          {translate('OnboardingOrganization.bodyUsername')}
        </Typography>
      </Box>
    </Box>
  );
};

const OrganizationStepEmail = ({ values, onDisabledChange, onChange }) => {
  const useStyles = makeStyles((theme) => ({
    organizationEmailContainer: {
      position: 'relative',
      zIndex: theme.zIndex.layer1,
    },
  }));

  const classes = useStyles();
  const [emailValid, setEmailValid] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);

  const handleEmailStatus = (status) => {
    // Email status returns FALSE when valid
    setEmailValid(!status);
  };

  const handleEmail = (email) => {
    onChange({
      email,
    });
  };

  const handlePrivacy = ({ target: { checked } }) => {
    setPrivacy(checked);
  };

  const handleTerms = ({ target: { checked } }) => {
    setTerms(checked);
  };

  useEffect(() => {
    onDisabledChange(![emailValid, privacy, terms].every((b) => b === true));
  }, [emailValid, privacy, terms, onDisabledChange]);

  return (
    <Box className={classes.organizationEmailContainer}>
      <Typography align="center" gutterBottom variant="h6">
        {translate('Onboarding.headingEmail')}
      </Typography>
      <Box mt={3}>
        <VerifiedEmailInput
          label={translate('Onboarding.formEmail')}
          value={values.email}
          onChange={handleEmail}
          onStatusChange={handleEmailStatus}
        />
        <Box mb={3} mt={6}>
          <Typography>
            {translate('Onboarding.bodyEmailOrganization')}
          </Typography>
        </Box>
        <Box mt={2} textAlign={'left'}>
          <Box>
            <CheckboxPrivacy checked={privacy} onChange={handlePrivacy} />
          </Box>
          <Box>
            <CheckboxTerms checked={terms} onChange={handleTerms} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const OrganizationStepAvatar = ({ values, onDisabledChange, onChange }) => {
  const useStyles = makeStyles((theme) => ({
    organizationStepAvatarContainer: {
      position: 'relative',
      zIndex: theme.zIndex.layer1,
    },
  }));
  const classes = useStyles();

  const handleUpload = (avatarUrl) => {
    onChange({
      avatarUrl,
    });
  };

  return (
    <Box className={classes.organizationStepAvatarContainer}>
      <Typography align="center" gutterBottom variant="h6">
        {translate('OnboardingOrganization.headingAvatar')}
      </Typography>
      <Box mb={4} mt={4}>
        <AvatarUploader
          shouldHaveIndicator
          value={values.avatarUrl}
          onLoadingChange={onDisabledChange}
          onUpload={handleUpload}
        />
      </Box>
    </Box>
  );
};

const OrganizationStepPrefund = ({ onDisabledChange, values, onChange }) => {
  const [isError, setIsError] = useState(false);
  const { safe, token } = useSelector((state) => state);

  const useStyles = makeStyles((theme) => ({
    organizationStepPrefundContainer: {
      position: 'relative',
      zIndex: theme.zIndex.layer1,
    },
  }));
  const classes = useStyles();

  const maxAmount = parseFloat(
    formatCirclesValue(web3.utils.toBN(token.balance)),
  );

  const handleChange = (event) => {
    const prefundValue = event.target.value;
    const isValid = validateAmount(prefundValue);
    const isAmountTooHigh =
      (prefundValue ? parseFloat(prefundValue) : 0) > maxAmount;

    setIsError(prefundValue > 0 ? !isValid || isAmountTooHigh : false);

    onChange({
      prefundValue,
    });
  };

  useEffect(() => {
    onDisabledChange(
      isError || !values.prefundValue || values.prefundValue === 0,
    );
  }, [onDisabledChange, isError, values.prefundValue]);

  return (
    <Box className={classes.organizationStepPrefundContainer}>
      <Typography align="center" gutterBottom variant="h6">
        {translate('OnboardingOrganization.headingPrefund')}
      </Typography>
      <Typography>{translate('OnboardingOrganization.bodyPrefund')}</Typography>
      <Box mt={4}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box mb={1.5}>
              <TransferInfoBalanceCard
                address={safe.currentAccount}
                balance={token.balance}
                label={translate('OnboardingOrganization.formPrefundSender')}
              />
            </Box>
          </Grid>
          <Grid item xs={12}>
            <TransferCirclesInput
              autoFocus
              errorMessage={translate(
                'OnboardingOrganization.formPrefundInvalid',
              )}
              id="prefundValue"
              isError={isError}
              label={translate('OnboardingOrganization.formPrefundAmount')}
              value={values.prefundValue}
              onChange={handleChange}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

const stepProps = {
  onChange: PropTypes.func.isRequired,
  onDisabledChange: PropTypes.func.isRequired,
  values: PropTypes.object.isRequired,
};

OrganizationStepUsername.propTypes = {
  ...stepProps,
};

OrganizationStepEmail.propTypes = {
  ...stepProps,
};

OrganizationStepAvatar.propTypes = {
  ...stepProps,
};

OrganizationStepPrefund.propTypes = {
  ...stepProps,
};

export default OnboardingOrganization;
