import { Request, Response } from "express";
import { default as utils }from '../utils'
import { User, UserInterface } from '../models/user';

import Stripe from 'stripe';

const stripe = new Stripe('sk_test_26PHem9AhJZvU623DfE1x4sd', {
  apiVersion: '2023-10-16', 
});

export class AppController {
 
public async updateUser(req: Request & {user: any}, res: Response) {

  const required = [
    { name: 'name', type: 'string' },
    { name: 'username', type: 'string' },

  ]
  const { body } = req;
  const hasRequired = utils.helpers.validParam(body, required)

  if (hasRequired.success) {
    console.log(req.user.email, 'rr')
    let email: string = req.user.email.toLowerCase();

    User.findOne({email}, async (err:Error, user) => {
        if (err){
            console.log(err, 'user signup error');
            return utils.helpers.sendErrorResponse(res, { }, 'Something went wrong, please try again')
        }

       if(user != null){ 

               
            User.updateOne(
              { email: email}, {
              $set: {
                  name: body.name,
                  username: body.username
              },
          }, (err, updated) => {
          
              if (err) {
                  console.log(err);
                  return utils.helpers.errorResponse(
                    res,
                    [],
                    'Something went wrong, please try again',
                    )
              }
              
                  return utils.helpers.sendSuccessResponse(
                    res,
                    [],
                    'User has been updated',
                    )


             
            });


             


        }else{

            return utils.helpers.errorResponse(
              res,
              [],
              'User does not exists',
              )
      
  
        }
            
        
    })
  
  }else{

    console.log(hasRequired.message)
    const message = hasRequired.message
  return utils.helpers.sendErrorResponse(
    res,
    { message },
    'Missing required fields',
    )

  }
}

public async stripe(req: Request & {user: any}, res: Response) {

  const sig = req.headers['stripe-signature'] as string; //  verify signature to prevent replay attacks
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, 'your_stripe_webhook_secret');
  } catch (err) {
    console.log('Webhook signature verification failed.');
    return res.sendStatus(400);
  }

  // Handle the event according to your application's logic
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Handle successful payment intent
      console.log('Payment succeeded:', event.data.object);
      const email = event.data.object.customer // assuming email exists in the payload
      User.findOne({email}, async (err:Error, user) => {
        if (err){
          console.log(err, 'error while updating records')  
        }

       if(user != null){ 
 
            User.updateOne(
              { email: email}, {
              $set: {
                  status: 'paid', //update status to paid
              },
          }, (err, updated) => {
          
              if (err) {
                  console.log(err);
                 
              }
              
              console.log('User has been updated')
            });

        }else{
            console.log('User does not exist')
        }
    })
 
    case 'payment_intent.payment_failed':
      // Handle failed payment intent
      console.log('Payment failed:', event.data.object);
      break;
    
    default:
      // Unexpected event type
      console.log('Unhandled event type:', event.type);
      break;
  }

  // Respond to Stripe to acknowledge receipt of the event
  res.json({ received: true });


}



}