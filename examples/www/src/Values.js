import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    overflow: 'hidden',
    backgroundColor: theme.palette.primary.light,
  },
  container: {
    marginTop: theme.spacing(15),
    marginBottom: theme.spacing(30),
    display: 'flex',
    position: 'relative',
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(0, 5),
  },
  title: {
    marginTop: theme.spacing(5),
    marginBottom: theme.spacing(5),
  },
}));

export function Values() {
  const classes = useStyles();

  return (
    <section className={classes.root}>
      <Container className={classes.container}>
        <Grid container spacing={5}>
          <Grid item xs={12} md={4}>
            <div className={classes.item}>
              <Typography variant="h5" className={classes.title}>
                Learn Docker
              </Typography>
              <Typography variant="h6">
                {'WebDocker provides a way to try Docker without the need to download'}
                {', install or register at a cloud provider. Launch instantly!'}
              </Typography>
            </div>
          </Grid>
          <Grid item xs={12} md={4}>
            <div className={classes.item}>
              <Typography variant="h5" className={classes.title}>
                Security research
              </Typography>
              <Typography variant="h6">
                {'Want a sandbox to execute untrusted code in an isolated environment? '}
                {'Our highly customizable BrokerOS backend with multiple architecture suits your need.'}
              </Typography>
            </div>
          </Grid>
          <Grid item xs={12} md={4}>
            <div className={classes.item}>
              <Typography variant="h5" className={classes.title}>
                Web IDE
              </Typography>
              <Typography variant="h6">
                {'Map files, compile the code, and grab the output all in one browser. '}
                {'You can even build projects and directly flash it to IoT devices over WebUSB.'}
              </Typography>
            </div>
          </Grid>
        </Grid>
      </Container>
    </section>
  );
}
