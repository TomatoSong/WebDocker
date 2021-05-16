import React from 'react';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Link from '@material-ui/core/Link';

function Copyright() {
    return (
        <Typography variant="body2" color="textSecondary" align="center">
            {'Copyright © '}
            <Link color="inherit" href="https://github.com/xlab-uiuc">
                xlab-uiuc
            </Link>{' '}
            {new Date().getFullYear()}
            {'.'}
        </Typography>
    );
}

const useStyles = makeStyles(theme => ({
    footer: {
        backgroundColor:
            theme.palette.type === 'light'
                ? theme.palette.grey[200]
                : theme.palette.grey[800],
        padding: theme.spacing(6),
        marginTop: 'auto',
    },
}));

export default function Footer() {
    const classes = useStyles();

    return (
        <footer className={classes.footer}>
            <Typography variant="h6" align="center" gutterBottom>
                University of Illinois
            </Typography>
            <Typography
                variant="subtitle1"
                align="center"
                color="textSecondary"
                component="p"
            >
                Follow us on GitHub
            </Typography>
            <Copyright />
        </footer>
    );
}
